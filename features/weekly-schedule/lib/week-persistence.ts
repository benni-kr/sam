/**
 * Weekly Schedule Persistence
 *
 * This module owns the weekly-event persistence adapter for the planner
 * bounded context. It keeps the Supabase shape, auth handling, and semester
 * hydration logic isolated from the rest of the weekly schedule domain.
 */

import {
  defaultPlannerSemesterId,
  plannerSemesterIds,
  type PlannerSemesterId,
} from "@/features/planner/lib/planner";
import {
  plannerWeekEventCategories,
  plannerWeekdays,
  type PlannerWeekEvent,
  type PlannerWeekEventCategory,
  type PlannerWeekday,
} from "@/features/weekly-schedule/lib/week-types";
import { getPlannerScope } from "@/features/planner/lib/planner-scope";

export type PlannerWeekEventsBySemester = Partial<
  Record<PlannerSemesterId, PlannerWeekEvent[]>
>;

/**
 * The weekly-event persistence contract used by the planner state layer.
 */
export type PlannerWeekEventStore = {
  loadWeekEventsBySemester: () => Promise<PlannerWeekEventsBySemester | null>;
  insertWeekEvent: (
    event: PlannerWeekEvent,
    semesterId: PlannerSemesterId,
  ) => Promise<void>;
  updateWeekEvent: (
    eventId: string,
    patch: Partial<PlannerWeekEvent> & { semesterId?: PlannerSemesterId },
  ) => Promise<void>;
  deleteWeekEvent: (eventId: string) => Promise<void>;
  saveWeekEventsBySemester?: (
    data: PlannerWeekEventsBySemester,
  ) => Promise<void>;
};

const SUPABASE_WEEK_EVENTS_TABLE = "planner_week_events";
const PERSISTENCE_LOG_PREFIX = "[SAM persistence]";

/**
 * Row shape mapping directly to the `planner_week_events` table in Supabase.
 * Column names intentionally mirror the database schema so rows can be
 * serialized and deserialized without transformation when calling the REST
 * endpoints.
 */
export type SupabaseWeekEventRow = {
  planner_scope: string;
  semester_id: PlannerSemesterId;
  event_id: string;
  title: string;
  description: string | null;
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


export function isWeekCategoryValue(
  value: unknown,
): value is PlannerWeekEventCategory {
  return (
    typeof value === "string" &&
    plannerWeekEventCategories.includes(value as PlannerWeekEventCategory)
  );
}

export function isWeekdayValue(value: unknown): value is PlannerWeekday {
  return (
    typeof value === "string" &&
    plannerWeekdays.includes(value as PlannerWeekday)
  );
}

export function normalizeParticipants(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((name) => name.trim())
    .filter(Boolean);
}

export function rowToPlannerWeekEvent(
  row: SupabaseWeekEventRow,
): { semesterId: PlannerSemesterId; event: PlannerWeekEvent } | null {
  if (!row.event_id || !row.title || !isWeekdayValue(row.day) || !row.start_time || !row.end_time) {
    return null;
  }

  const category = isWeekCategoryValue(row.category)
    ? row.category
    : "Other";

  const targetSemesterId = plannerSemesterIds.includes(row.semester_id)
    ? row.semester_id
    : defaultPlannerSemesterId;

  return {
    semesterId: targetSemesterId,
    event: {
      id: row.event_id,
      title: row.title,
      description: row.description ?? undefined,
      category,
      day: row.day,
      startTime: row.start_time,
      endTime: row.end_time,
      participants: normalizeParticipants(row.participants),
    },
  };
}

export function weekEventToRow(
  event: PlannerWeekEvent,
  semesterId: PlannerSemesterId,
  plannerScope: string,
): SupabaseWeekEventRow {
  return {
    planner_scope: plannerScope,
    semester_id: semesterId,
    event_id: event.id,
    title: event.title,
    description: event.description ?? null,
    category: event.category,
    day: event.day,
    start_time: event.startTime,
    end_time: event.endTime,
    participants: event.participants,
  };
}

export function weekEventsBySemesterToRows(
  weekEventsBySemester: PlannerWeekEventsBySemester,
  plannerScope: string,
): SupabaseWeekEventRow[] {
  const rows: SupabaseWeekEventRow[] = [];

  for (const semesterId of plannerSemesterIds) {
    const semesterEvents = weekEventsBySemester[semesterId] ?? [];

    for (const event of semesterEvents) {
      rows.push(weekEventToRow(event, semesterId, plannerScope));
    }
  }

  return rows;
}

export function rowsToWeekEventsBySemester(rows: SupabaseWeekEventRow[]) {
  const weekEventsBySemester: PlannerWeekEventsBySemester = {};

  for (const semesterId of plannerSemesterIds) {
    weekEventsBySemester[semesterId] = [];
  }

  for (const row of rows) {
    const parsed = rowToPlannerWeekEvent(row);
    if (!parsed) {
      continue;
    }

    weekEventsBySemester[parsed.semesterId]?.push(parsed.event);
  }

  return weekEventsBySemester;
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

function getAuthHeader(anonKey: string) {
  const token = getClientAuthToken();
  return `Bearer ${token || anonKey}`;
}

async function fetchSupabaseWeekEventsBySemester(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
) {
  const endpoint = `${config.url}/rest/v1/${SUPABASE_WEEK_EVENTS_TABLE}?select=planner_scope,semester_id,event_id,title,description,category,day,start_time,end_time,participants&planner_scope=eq.${encodeURIComponent(config.plannerScope)}`;

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

export async function insertSupabaseWeekEvent(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  event: PlannerWeekEvent,
  semesterId: PlannerSemesterId,
) {
  const row = weekEventToRow(event, semesterId, config.plannerScope);
  const endpoint = `${config.url}/rest/v1/${SUPABASE_WEEK_EVENTS_TABLE}?on_conflict=planner_scope,event_id`;

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
    const errorDetails = await response
      .text()
      .catch(() => "No details available");
    throw new Error(
      `Failed to insert planner week event to Supabase: ${response.status} ${errorDetails}`,
    );
  }
}

export async function updateSupabaseWeekEvent(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  eventId: string,
  patch: Partial<PlannerWeekEvent> & { semesterId?: PlannerSemesterId },
) {
  const endpoint = `${config.url}/rest/v1/${SUPABASE_WEEK_EVENTS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}&event_id=eq.${encodeURIComponent(eventId)}`;

  const body: Record<string, unknown> = {};

  if (patch.title !== undefined) body.title = patch.title;
  if (patch.description !== undefined) body.description = patch.description ?? null;
  if (patch.category !== undefined) body.category = patch.category;
  if (patch.day !== undefined) body.day = patch.day;
  if (patch.startTime !== undefined) body.start_time = patch.startTime;
  if (patch.endTime !== undefined) body.end_time = patch.endTime;
  if (patch.participants !== undefined) body.participants = patch.participants;
  if (patch.semesterId !== undefined) body.semester_id = patch.semesterId;

  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      apikey: config.anonKey,
      Authorization: getAuthHeader(config.anonKey),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorDetails = await response
      .text()
      .catch(() => "No details available");
    throw new Error(
      `Failed to update planner week event in Supabase: ${response.status} ${errorDetails}`,
    );
  }
}

export async function deleteSupabaseWeekEvent(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  eventId: string,
) {
  const endpoint = `${config.url}/rest/v1/${SUPABASE_WEEK_EVENTS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}&event_id=eq.${encodeURIComponent(eventId)}`;

  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      apikey: config.anonKey,
      Authorization: getAuthHeader(config.anonKey),
    },
  });

  if (!response.ok) {
    const errorDetails = await response
      .text()
      .catch(() => "No details available");
    throw new Error(
      `Failed to delete planner week event in Supabase: ${response.status} ${errorDetails}`,
    );
  }
}

export const supabaseWeekEventStore: PlannerWeekEventStore = {
  async loadWeekEventsBySemester() {
    const config = requireSupabaseConfig();
    return fetchSupabaseWeekEventsBySemester(config);
  },

  async insertWeekEvent(event, semesterId) {
    const config = requireSupabaseConfig();
    await insertSupabaseWeekEvent(config, event, semesterId);
  },

  async updateWeekEvent(eventId, patch) {
    const config = requireSupabaseConfig();
    await updateSupabaseWeekEvent(config, eventId, patch);
  },

  async deleteWeekEvent(eventId) {
    const config = requireSupabaseConfig();
    await deleteSupabaseWeekEvent(config, eventId);
  },
};

/**
 * Resolves the weekly-event store implementation for the current runtime.
 */
export function resolveWeekEventStore(): PlannerWeekEventStore {
  const plannerScope = getPlannerScope();

  if (!hasSupabaseConfig()) {
    throw new Error(
      "CRITICAL: Supabase config missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  logPersistenceHealth(`Store mode: supabase only (scope: ${plannerScope}).`);
  return supabaseWeekEventStore;
}

