import { SEMESTER_FRIENDS } from "@/features/planner/lib/planner";
import type { Friend } from "@/features/friends/lib/friend";
import { getPlannerScope } from "@/features/planner/lib/planner-scope";

/**
 * Friends Persistence
 *
 * This module isolates the Supabase adapter for planner participants so the
 * friends domain can hydrate and persist its own state independently.
 */

const SUPABASE_FRIENDS_TABLE = "planner_friends";

/**
 * Row shape mapping directly to the `planner_friends` Supabase table.
 * Fields are named to match the database column names used by the REST API
 * so rows can be serialized/deserialized without transformation.
 */
export type SupabaseFriendRow = {
  planner_scope: string;
  friend_name: string;
  birthday: string | null;
};

export function normalizeBirthday(birthday: string | undefined) {
  if (!birthday) {
    return undefined;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(birthday) ? birthday : undefined;
}

export function dedupeFriends(friends: Friend[]) {
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

export function friendToRow(
  friend: Friend,
  plannerScope: string,
): SupabaseFriendRow {
  return {
    planner_scope: plannerScope,
    friend_name: friend.name.trim(),
    birthday: friend.birthday ?? null,
  };
}

export function rowToFriend(row: SupabaseFriendRow): Friend {
  return {
    name: row.friend_name,
    birthday: normalizeBirthday(row.birthday ?? undefined),
  };
}

function friendsToRows(
  friends: Friend[],
  plannerScope: string,
): SupabaseFriendRow[] {
  return dedupeFriends(friends).map((friend) =>
    friendToRow(friend, plannerScope),
  );
}

export function rowsToFriends(rows: SupabaseFriendRow[]) {
  return dedupeFriends(rows.map(rowToFriend)).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
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

function getAuthHeader(anonKey: string) {
  const token = getClientAuthToken();
  return `Bearer ${token || anonKey}`;
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

export async function insertFriend(friend: Friend) {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase configuration missing.");
  }

  const row = friendToRow(friend, config.plannerScope);
  const endpoint = `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?on_conflict=planner_scope,friend_name`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: getAuthHeader(config.anonKey),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    throw new Error(`Failed to insert planner friend: ${response.status}`);
  }
}

export async function updateFriendInStore(
  currentName: string,
  nextFriend: Friend,
) {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase configuration missing.");
  }

  // If name changed, we delete old row and insert new row, or update
  const endpoint = `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}&friend_name=eq.${encodeURIComponent(currentName)}`;

  const isRenaming = currentName.toLowerCase() !== nextFriend.name.toLowerCase();

  if (isRenaming) {
    // Insert new friend before deleting old to prevent data loss on network failure
    await insertFriend(nextFriend);
    await deleteFriendFromStore(currentName);
    return;
  }

  // Same name, update birthday
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      apikey: config.anonKey,
      Authorization: getAuthHeader(config.anonKey),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      birthday: nextFriend.birthday ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update planner friend: ${response.status}`);
  }
}

export async function deleteFriendFromStore(name: string) {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase configuration missing.");
  }

  const endpoint = `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}&friend_name=eq.${encodeURIComponent(name)}`;

  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      apikey: config.anonKey,
      Authorization: getAuthHeader(config.anonKey),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete planner friend: ${response.status}`);
  }
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
  if (rows.length === 0) return null;

  const endpoint = `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?on_conflict=planner_scope,friend_name`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: getAuthHeader(config.anonKey),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error("Failed to save planner friends to Supabase.");
  }

  return null;
}

/**
 * Returns the built-in starter list for the friends domain.
 */
export function getDefaultFriends() {
  return dedupeFriends(
    SEMESTER_FRIENDS.map((name) => ({ name, birthday: undefined })),
  ).sort((left, right) => left.name.localeCompare(right.name));
}

