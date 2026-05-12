import { SEMESTER_FRIENDS } from "@/features/planner/lib/planner";
import type { Friend } from "@/features/friends/lib/friend";

/**
 * Friends Persistence
 *
 * This module isolates the Supabase adapter for planner participants so the
 * friends domain can hydrate and persist its own state independently.
 */

const SUPABASE_FRIENDS_TABLE = "planner_friends";
const DEFAULT_PLANNER_SCOPE = "default";

/**
 * Row shape mapping directly to the `planner_friends` Supabase table.
 * Fields are named to match the database column names used by the REST API
 * so rows can be serialized/deserialized without transformation.
 */
type SupabaseFriendRow = {
  planner_scope: string;
  friend_name: string;
  birthday: string | null;
};

function normalizeBirthday(birthday: string | undefined) {
  if (!birthday) {
    return undefined;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(birthday) ? birthday : undefined;
}

function normalizePlannerScope(rawScope: string | undefined) {
  const normalized = (rawScope ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || DEFAULT_PLANNER_SCOPE;
}

function getPlannerScope() {
  return normalizePlannerScope(process.env.NEXT_PUBLIC_SAM_PLANNER_SCOPE);
}

function dedupeFriends(friends: Friend[]) {
  const uniqueByLowerCase = new Map<string, Friend>();

  for (const friend of friends) {
    const normalizedName = friend.name.trim();

    if (!normalizedName) {
      continue;
    }

    // Use the lower-cased string as the Map key to enforce case-insensitive
    // uniqueness. This ensures "Alex" and "alex" are treated as the same
    // participant rather than two separate entries.
    const key = normalizedName.toLocaleLowerCase();

    if (!uniqueByLowerCase.has(key)) {
      uniqueByLowerCase.set(key, {
        name: normalizedName,
        birthday: normalizeBirthday(friend.birthday),
      });
    }
  }

  return Array.from(uniqueByLowerCase.values());
}

function friendsToRows(
  friends: Friend[],
  plannerScope: string,
): SupabaseFriendRow[] {
  return dedupeFriends(friends).map((friend) => ({
    planner_scope: plannerScope,
    friend_name: friend.name,
    birthday: friend.birthday ?? null,
  }));
}

function rowsToFriends(rows: SupabaseFriendRow[]) {
  return dedupeFriends(
    rows.map((row) => ({
      name: row.friend_name,
      birthday: row.birthday ?? undefined,
    })),
  ).sort((left, right) => left.name.localeCompare(right.name));
}

function buildNotInFilter(values: string[]) {
  return values.length > 0
    ? `not.in.(${values.map(encodeURIComponent).join(",")})`
    : "";
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const plannerScope = getPlannerScope();

  if (!url || !anonKey) {
    return null;
  }

  return {
    url,
    anonKey,
    plannerScope,
  };
}

function getClientAuthToken() {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem("sam_auth_token");
}

/**
 * Loads the persisted friend list for the active planner scope.
 */
export async function loadFriends() {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error(
      "Supabase configuration missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const endpoint = `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?select=planner_scope,friend_name,birthday&planner_scope=eq.${encodeURIComponent(config.plannerScope)}`;

  if (typeof window !== "undefined") {
    const token = getClientAuthToken();

    if (!token) {
      return null;
    }

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        try {
          window.localStorage.removeItem("sam_auth_token");
          window.dispatchEvent(new CustomEvent("sam:auth:invalid"));
        } catch {
          // no-op
        }

        return null;
      }

      console.error("Failed to load planner friends from Supabase.");
      return null;
    }

    const rows = (await response.json()) as SupabaseFriendRow[];
    return rowsToFriends(rows);
  }

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
  });

  if (!response.ok) {
    console.error("Failed to load planner friends from Supabase.");
    return null;
  }

  const rows = (await response.json()) as SupabaseFriendRow[];
  return rowsToFriends(rows);
}

/**
 * Persists the current friend list for the active planner scope.
 */
export async function saveFriends(friends: Friend[]) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error(
      "Supabase configuration missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const rows = friendsToRows(friends, config.plannerScope);

  if (typeof window !== "undefined") {
    const token = getClientAuthToken();

    if (!token) {
      return null;
    }

    const authHeader = `Bearer ${token}`;

    if (rows.length > 0) {
      // Upsert the current client list into Supabase. This first POST call
      // writes or merges the provided rows so existing entries are preserved
      // and new names are inserted (on_conflict handles deduplication).
      const endpoint = `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?on_conflict=planner_scope,friend_name`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: config.anonKey,
          Authorization: authHeader,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(rows),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          try {
            window.localStorage.removeItem("sam_auth_token");
            window.dispatchEvent(new CustomEvent("sam:auth:invalid"));
          } catch {
            // no-op
          }

          return null;
        }

        throw new Error("Failed to save planner friends to Supabase.");
      }
    }

    // Prune step: remove any rows in the database that are not present in
    // the client's current list. This keeps the server-side data synced with
    // the client: names omitted by the user are deleted from Supabase.
    const friendNames = rows.map((row) => row.friend_name);
    const deleteFilter = buildNotInFilter(friendNames);
    const deleteEndpoint = deleteFilter
      ? `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}&friend_name=${deleteFilter}`
      : `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}`;

    const deleteResponse = await fetch(deleteEndpoint, {
      method: "DELETE",
      headers: {
        apikey: config.anonKey,
        Authorization: authHeader,
      },
    });

    if (!deleteResponse.ok) {
      if (deleteResponse.status === 401 || deleteResponse.status === 403) {
        try {
          window.localStorage.removeItem("sam_auth_token");
          window.dispatchEvent(new CustomEvent("sam:auth:invalid"));
        } catch {
          // no-op
        }

        return null;
      }

      throw new Error("Failed to prune planner friends in Supabase.");
    }

    return null;
  }

  if (rows.length > 0) {
    // Upsert (server-side): ensure the canonical list exists in the DB.
    const endpoint = `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?on_conflict=planner_scope,friend_name`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    });

    if (!response.ok) {
      throw new Error("Failed to save planner friends to Supabase.");
    }
  }

  // Prune step (server-side): remove any rows from Supabase not present
  // in the client's current array. This keeps the server in sync with the
  // client's desired friend list.
  const friendNames = rows.map((row) => row.friend_name);
  const deleteFilter = buildNotInFilter(friendNames);
  const deleteEndpoint = deleteFilter
    ? `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}&friend_name=${deleteFilter}`
    : `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}`;

  const deleteResponse = await fetch(deleteEndpoint, {
    method: "DELETE",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
  });

  if (!deleteResponse.ok) {
    throw new Error("Failed to prune planner friends in Supabase.");
  }
}

/**
 * Returns the built-in starter list for the friends domain.
 */
export function getDefaultFriends() {
  return dedupeFriends(
    SEMESTER_FRIENDS.map((name) => ({ name, birthday: undefined })),
  ).sort((left, right) => left.name.localeCompare(right.name));
}
