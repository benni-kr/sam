import {
  defaultPlannerSemesterId,
  plannerEventCategories,
  plannerSemesterIds,
  type PlannerEvent,
  type PlannerSemesterId,
} from "@/features/planner/lib/planner";

export type PlannerEventsBySemester = Partial<
  Record<PlannerSemesterId, PlannerEvent[]>
>;

export type PlannerEventStore = {
  loadEventsBySemester: () => Promise<PlannerEventsBySemester | null>;
  saveEventsBySemester: (
    eventsBySemester: PlannerEventsBySemester,
  ) => Promise<void>;
  loadFriends: () => Promise<string[] | null>;
  saveFriends: (friends: string[]) => Promise<void>;
};

const SUPABASE_EVENTS_TABLE = "planner_events";
const SUPABASE_FRIENDS_TABLE = "planner_friends";
const PERSISTENCE_LOG_PREFIX = "[SAM persistence]";
const DEFAULT_PLANNER_SCOPE = "default";

type SupabaseEventRow = {
  planner_scope: string;
  semester_id: PlannerSemesterId | null;
  event_id: string;
  title: string;
  category: string;
  start_date: string | null;
  end_date: string | null;
  participants: unknown;
};

type SupabaseFriendRow = {
  planner_scope: string;
  friend_name: string;
};

function shouldLogPersistenceHealth() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_SAM_LOG_PERSISTENCE === "true"
  );
}

function logPersistenceHealth(message: string) {
  if (!shouldLogPersistenceHealth()) {
    return;
  }

  console.info(`${PERSISTENCE_LOG_PREFIX} ${message}`);
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

function isCategoryValue(value: unknown): value is PlannerEvent["category"] {
  return (
    typeof value === "string" &&
    plannerEventCategories.includes(value as PlannerEvent["category"])
  );
}

function normalizeParticipants(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((name) => name.trim())
    .filter(Boolean);
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

function eventsBySemesterToRows(
  eventsBySemester: PlannerEventsBySemester,
  plannerScope: string,
): SupabaseEventRow[] {
  const rows: SupabaseEventRow[] = [];

  for (const semesterId of plannerSemesterIds) {
    const semesterEvents = eventsBySemester[semesterId] ?? [];

    for (const event of semesterEvents) {
      rows.push({
        planner_scope: plannerScope,
        semester_id: event.startDate ? semesterId : null,
        event_id: event.id,
        title: event.title,
        category: event.category,
        start_date: event.startDate,
        end_date: event.endDate,
        participants: event.participants,
      });
    }
  }

  return rows;
}

function rowsToEventsBySemester(rows: SupabaseEventRow[]) {
  const eventsBySemester: PlannerEventsBySemester = {};

  for (const semesterId of plannerSemesterIds) {
    eventsBySemester[semesterId] = [];
  }

  for (const row of rows) {
    if (!isCategoryValue(row.category)) {
      continue;
    }

    const targetSemesterId =
      row.semester_id && plannerSemesterIds.includes(row.semester_id)
        ? row.semester_id
        : defaultPlannerSemesterId;

    eventsBySemester[targetSemesterId]?.push({
      id: row.event_id,
      title: row.title,
      category: row.category as PlannerEvent["category"],
      startDate: row.start_date,
      endDate: row.end_date,
      participants: normalizeParticipants(row.participants),
    });
  }

  return eventsBySemester;
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

function requireSupabaseConfig() {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error(
      "Supabase configuration missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return config;
}

function hasSupabaseConfig() {
  return Boolean(getSupabaseConfig());
}

async function fetchSupabaseEventsBySemester(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
) {
  const endpoint = `${config.url}/rest/v1/${SUPABASE_EVENTS_TABLE}?select=planner_scope,semester_id,event_id,title,category,start_date,end_date,participants&planner_scope=eq.${encodeURIComponent(config.plannerScope)}`;
  // If we're running in the browser prefer the client auth token. If the
  // token hasn't been stored yet (race during hydration) return `null` so
  // callers can delay hydration instead of failing the entire load.
  if (typeof window !== "undefined") {
    const token = getClientAuthToken();

    if (!token) {
      logPersistenceHealth(
        "No client auth token available yet; deferring events load.",
      );
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
        // Token invalid/expired — clear and notify the app to re-auth.
        try {
          window.localStorage.removeItem("sam_auth_token");
          window.dispatchEvent(new CustomEvent("sam:auth:invalid"));
        } catch {
          // noop
        }

        logPersistenceHealth(
          "Auth token invalid or expired while loading events.",
        );
        return null;
      }

      throw new Error("Failed to load planner events from Supabase.");
    }

    const rows = (await response.json()) as SupabaseEventRow[];
    return rowsToEventsBySemester(rows);
  }

  // Server-side: use the anon key so server rendering still works.
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load planner events from Supabase.");
  }

  const rows = (await response.json()) as SupabaseEventRow[];
  return rowsToEventsBySemester(rows);
}

async function upsertSupabaseEventsBySemester(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  eventsBySemester: PlannerEventsBySemester,
) {
  const rows = eventsBySemesterToRows(eventsBySemester, config.plannerScope);
  const deleteEndpoint = `${config.url}/rest/v1/${SUPABASE_EVENTS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}`;
  const deleteResponse = await fetch(deleteEndpoint, {
    method: "DELETE",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${typeof window !== "undefined" ? window.localStorage.getItem("sam_auth_token") || config.anonKey : config.anonKey}`,
    },
  });

  if (!deleteResponse.ok) {
    throw new Error("Failed to clear planner events in Supabase.");
  }

  if (rows.length === 0) {
    return;
  }

  const endpoint = `${config.url}/rest/v1/${SUPABASE_EVENTS_TABLE}?on_conflict=planner_scope,event_id`;
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
    throw new Error("Failed to save planner events to Supabase.");
  }
}

async function fetchSupabaseFriends(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
) {
  const endpoint = `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?select=planner_scope,friend_name&planner_scope=eq.${encodeURIComponent(config.plannerScope)}&order=friend_name.asc`;
  if (typeof window !== "undefined") {
    const token = getClientAuthToken();

    if (!token) {
      logPersistenceHealth(
        "No client auth token available yet; deferring friends load.",
      );
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

        logPersistenceHealth(
          "Auth token invalid or expired while loading friends.",
        );
        return null;
      }

      throw new Error("Failed to load planner friends from Supabase.");
    }

    const rows = (await response.json()) as SupabaseFriendRow[];
    return rowsToFriends(rows);
  }

  // Server-side: fallback to anon key
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

async function upsertSupabaseFriends(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  friends: string[],
) {
  const rows = friendsToRows(friends, config.plannerScope);
  const deleteEndpoint = `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}`;

  const deleteResponse = await fetch(deleteEndpoint, {
    method: "DELETE",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${typeof window !== "undefined" ? window.localStorage.getItem("sam_auth_token") || config.anonKey : config.anonKey}`,
    },
  });

  if (!deleteResponse.ok) {
    throw new Error("Failed to clear planner friends in Supabase.");
  }

  if (rows.length === 0) {
    return;
  }

  const endpoint = `${config.url}/rest/v1/${SUPABASE_FRIENDS_TABLE}`;
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

export const supabasePlannerEventStore: PlannerEventStore = {
  async loadEventsBySemester() {
    const config = requireSupabaseConfig();
    return fetchSupabaseEventsBySemester(config);
  },

  async saveEventsBySemester(eventsBySemester) {
    const config = requireSupabaseConfig();
    await upsertSupabaseEventsBySemester(config, eventsBySemester);
  },

  async loadFriends() {
    const config = requireSupabaseConfig();
    return fetchSupabaseFriends(config);
  },

  async saveFriends(friends) {
    const config = requireSupabaseConfig();
    await upsertSupabaseFriends(config, friends);
  },
};

export function resolvePlannerEventStore(): PlannerEventStore {
  const plannerScope = getPlannerScope();

  if (!hasSupabaseConfig()) {
    throw new Error(
      "CRITICAL: Supabase config missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  logPersistenceHealth(`Store mode: supabase only (scope: ${plannerScope}).`);
  return supabasePlannerEventStore;
}
