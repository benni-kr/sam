import { SEMESTER_FRIENDS } from "@/features/planner/lib/planner";

const SUPABASE_FRIENDS_TABLE = "planner_friends";
const DEFAULT_PLANNER_SCOPE = "default";

type SupabaseFriendRow = {
  planner_scope: string;
  friend_name: string;
};

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

function dedupeNames(names: string[]) {
  const uniqueByLowerCase = new Map<string, string>();

  for (const name of names) {
    const normalized = name.trim();

    if (!normalized) {
      continue;
    }

    const key = normalized.toLocaleLowerCase();

    if (!uniqueByLowerCase.has(key)) {
      uniqueByLowerCase.set(key, normalized);
    }
  }

  return Array.from(uniqueByLowerCase.values());
}

function friendsToRows(
  friends: string[],
  plannerScope: string,
): SupabaseFriendRow[] {
  return dedupeNames(friends).map((friendName) => ({
    planner_scope: plannerScope,
    friend_name: friendName,
  }));
}

function rowsToFriends(rows: SupabaseFriendRow[]) {
  return dedupeNames(rows.map((row) => row.friend_name)).sort((left, right) =>
    left.localeCompare(right),
  );
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

export async function loadFriends() {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error(
      "Supabase configuration missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const endpoint = `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?select=planner_scope,friend_name&planner_scope=eq.${encodeURIComponent(config.plannerScope)}`;

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
          // noop
        }

        return null;
      }

      throw new Error("Failed to load planner friends from Supabase.");
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
    throw new Error("Failed to load planner friends from Supabase.");
  }

  const rows = (await response.json()) as SupabaseFriendRow[];
  return rowsToFriends(rows);
}

export async function saveFriends(friends: string[]) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error(
      "Supabase configuration missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const rows = friendsToRows(friends, config.plannerScope);

  if (rows.length > 0) {
    const endpoint = `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?on_conflict=planner_scope,friend_name`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${typeof window !== "undefined" ? window.localStorage.getItem("sam_auth_token") || config.anonKey : config.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    });

    if (!response.ok) {
      throw new Error("Failed to save planner friends to Supabase.");
    }
  }

  const friendNames = rows.map((row) => row.friend_name);
  const deleteFilter = buildNotInFilter(friendNames);
  const deleteEndpoint = deleteFilter
    ? `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}&friend_name=${deleteFilter}`
    : `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}`;

  const deleteResponse = await fetch(deleteEndpoint, {
    method: "DELETE",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${typeof window !== "undefined" ? window.localStorage.getItem("sam_auth_token") || config.anonKey : config.anonKey}`,
    },
  });

  if (!deleteResponse.ok) {
    throw new Error("Failed to prune planner friends in Supabase.");
  }
}

export function getDefaultFriends() {
  return dedupeNames([...SEMESTER_FRIENDS]).sort((left, right) =>
    left.localeCompare(right),
  );
}
