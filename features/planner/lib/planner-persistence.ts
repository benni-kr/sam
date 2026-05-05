import {
  defaultPlannerSemesterId,
  plannerEventCategories,
  plannerSemesterIds,
  type PlannerEvent,
  type PlannerSemesterId,
} from "@/features/planner/lib/planner";
import {
  plannerWeekEventCategories,
  plannerWeekdays,
  type PlannerWeekEvent,
  type PlannerWeekEventCategory,
  type PlannerWeekday,
} from "@/features/weekly-schedule/lib/week-types";

export type PlannerEventsBySemester = Partial<
  Record<PlannerSemesterId, PlannerEvent[]>
>;

export type PlannerWeekEventsBySemester = Partial<
  Record<PlannerSemesterId, PlannerWeekEvent[]>
>;

export type PlannerEventStore = {
  loadEventsBySemester: () => Promise<PlannerEventsBySemester | null>;
  saveEventsBySemester: (
    eventsBySemester: PlannerEventsBySemester,
  ) => Promise<void>;
  loadWeekEventsBySemester: () => Promise<PlannerWeekEventsBySemester | null>;
  saveWeekEventsBySemester: (
    weekEventsBySemester: PlannerWeekEventsBySemester,
  ) => Promise<void>;
};

const SUPABASE_EVENTS_TABLE = "planner_events";
const SUPABASE_WEEK_EVENTS_TABLE = "planner_week_events";
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

type SupabaseWeekEventRow = {
  planner_scope: string;
  semester_id: PlannerSemesterId;
  event_id: string;
  title: string;
  category: string;
  day: string;
  start_time: string | null;
  end_time: string | null;
  participants: unknown;
  updated_at?: string;
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

function isWeekCategoryValue(
  value: unknown,
): value is PlannerWeekEventCategory {
  return (
    typeof value === "string" &&
    plannerWeekEventCategories.includes(value as PlannerWeekEventCategory)
  );
}

function isWeekdayValue(value: unknown): value is PlannerWeekday {
  return (
    typeof value === "string" &&
    plannerWeekdays.includes(value as PlannerWeekday)
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

function weekEventsBySemesterToRows(
  weekEventsBySemester: PlannerWeekEventsBySemester,
  plannerScope: string,
): SupabaseWeekEventRow[] {
  const rows: SupabaseWeekEventRow[] = [];

  for (const semesterId of plannerSemesterIds) {
    const semesterEvents = weekEventsBySemester[semesterId] ?? [];

    for (const event of semesterEvents) {
      rows.push({
        planner_scope: plannerScope,
        semester_id: semesterId,
        event_id: event.id,
        title: event.title,
        category: event.category,
        day: event.day,
        start_time: event.startTime,
        end_time: event.endTime,
        participants: event.participants,
      });
    }
  }

  return rows;
}

function rowsToWeekEventsBySemester(rows: SupabaseWeekEventRow[]) {
  const weekEventsBySemester: PlannerWeekEventsBySemester = {};

  for (const semesterId of plannerSemesterIds) {
    weekEventsBySemester[semesterId] = [];
  }

  for (const row of rows) {
    if (!isWeekCategoryValue(row.category) || !isWeekdayValue(row.day)) {
      continue;
    }

    const targetSemesterId = plannerSemesterIds.includes(row.semester_id)
      ? row.semester_id
      : defaultPlannerSemesterId;

    if (!row.start_time || !row.end_time) {
      continue;
    }

    weekEventsBySemester[targetSemesterId]?.push({
      id: row.event_id,
      title: row.title,
      category: row.category,
      day: row.day,
      startTime: row.start_time,
      endTime: row.end_time,
      participants: normalizeParticipants(row.participants),
    });
  }

  return weekEventsBySemester;
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

  if (rows.length > 0) {
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

  const eventIds = rows.map((row) => row.event_id);
  const deleteFilter = buildNotInFilter(eventIds);
  const deleteEndpoint = deleteFilter
    ? `${config.url}/rest/v1/${SUPABASE_EVENTS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}&event_id=${deleteFilter}`
    : `${config.url}/rest/v1/${SUPABASE_EVENTS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}`;

  const deleteResponse = await fetch(deleteEndpoint, {
    method: "DELETE",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${typeof window !== "undefined" ? window.localStorage.getItem("sam_auth_token") || config.anonKey : config.anonKey}`,
    },
  });

  if (!deleteResponse.ok) {
    throw new Error("Failed to prune planner events in Supabase.");
  }
}

async function fetchSupabaseWeekEventsBySemester(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
) {
  const endpoint = `${config.url}/rest/v1/${SUPABASE_WEEK_EVENTS_TABLE}?select=planner_scope,semester_id,event_id,title,category,day,start_time,end_time,participants&planner_scope=eq.${encodeURIComponent(config.plannerScope)}`;

  if (typeof window !== "undefined") {
    const token = getClientAuthToken();

    if (!token) {
      logPersistenceHealth(
        "No client auth token available yet; deferring week events load.",
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
          "Auth token invalid or expired while loading week events.",
        );
        return null;
      }

      throw new Error("Failed to load planner week events from Supabase.");
    }

    const rows = (await response.json()) as SupabaseWeekEventRow[];
    return rowsToWeekEventsBySemester(rows);
  }

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load planner week events from Supabase.");
  }

  const rows = (await response.json()) as SupabaseWeekEventRow[];
  return rowsToWeekEventsBySemester(rows);
}

async function upsertSupabaseWeekEventsBySemester(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  weekEventsBySemester: PlannerWeekEventsBySemester,
) {
  const rows = weekEventsBySemesterToRows(
    weekEventsBySemester,
    config.plannerScope,
  );

  if (rows.length > 0) {
    const endpoint = `${config.url}/rest/v1/${SUPABASE_WEEK_EVENTS_TABLE}?on_conflict=planner_scope,event_id`;
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
      throw new Error("Failed to save planner week events to Supabase.");
    }
  }

  const eventIds = rows.map((row) => row.event_id);
  const deleteFilter = buildNotInFilter(eventIds);
  const deleteEndpoint = deleteFilter
    ? `${config.url}/rest/v1/${SUPABASE_WEEK_EVENTS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}&event_id=${deleteFilter}`
    : `${config.url}/rest/v1/${SUPABASE_WEEK_EVENTS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}`;

  const deleteResponse = await fetch(deleteEndpoint, {
    method: "DELETE",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${typeof window !== "undefined" ? window.localStorage.getItem("sam_auth_token") || config.anonKey : config.anonKey}`,
    },
  });

  if (!deleteResponse.ok) {
    throw new Error("Failed to prune planner week events in Supabase.");
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

  async loadWeekEventsBySemester() {
    const config = requireSupabaseConfig();
    return fetchSupabaseWeekEventsBySemester(config);
  },

  async saveWeekEventsBySemester(weekEventsBySemester) {
    const config = requireSupabaseConfig();
    await upsertSupabaseWeekEventsBySemester(config, weekEventsBySemester);
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
