/**
 * Planner Event Persistence
 *
 * This module owns the calendar-event persistence adapter for the planner
 * bounded context. It converts semester state to and from the Supabase schema
 * and hides auth, scope, and row-shaping details from the rest of the app.
 */

import {
  defaultPlannerSemesterId,
  plannerEventCategories,
  plannerSemesterIds,
  type PlannerEvent,
  type PlannerSemesterId,
} from "@/features/planner/lib/planner";
import { getPlannerScope } from "@/features/planner/lib/planner-scope";

/**
 * Planner calendar events grouped by semester id for persistence and hydration.
 */
export type PlannerEventsBySemester = Partial<
  Record<PlannerSemesterId, PlannerEvent[]>
>;

/**
 * The calendar-event persistence contract used by the planner state layer.
 */
export type PlannerEventStore = {
  loadEventsBySemester: () => Promise<PlannerEventsBySemester | null>;
  insertEvent: (
    event: PlannerEvent,
    semesterId: PlannerSemesterId,
  ) => Promise<void>;
  updateEvent: (
    eventId: string,
    patch: Partial<PlannerEvent> & { semesterId?: PlannerSemesterId },
  ) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  saveEventsBySemester?: (
    eventsBySemester: PlannerEventsBySemester,
  ) => Promise<void>;
};

const SUPABASE_EVENTS_TABLE = "planner_events";
const PERSISTENCE_LOG_PREFIX = "[SAM persistence]";

/**
 * Row shape mapping directly to the `planner_events` table in Supabase.
 * The field names intentionally mirror the database schema so this adapter
 * can serialize and hydrate rows without an extra translation layer.
 */
export type SupabaseEventRow = {
  planner_scope: string;
  semester_id: PlannerSemesterId | null;
  event_id: string;
  title: string;
  description: string | null;
  category: string;
  start_date: string | null;
  end_date: string | null;
  participants: unknown;
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

// Canonical implementation lives in planner-scope so the offline cache can use
// it without importing this adapter. Re-exported for existing consumers.
export { getPlannerScope };

export function isCategoryValue(value: unknown): value is PlannerEvent["category"] {
  return (
    typeof value === "string" &&
    plannerEventCategories.includes(value as PlannerEvent["category"])
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

export function rowToPlannerEvent(
  row: SupabaseEventRow,
): { semesterId: PlannerSemesterId; event: PlannerEvent } | null {
  if (!isCategoryValue(row.category)) {
    return null;
  }

  const targetSemesterId =
    row.semester_id && plannerSemesterIds.includes(row.semester_id)
      ? row.semester_id
      : defaultPlannerSemesterId;

  return {
    semesterId: targetSemesterId,
    event: {
      id: row.event_id,
      title: row.title,
      description: row.description ?? undefined,
      category: row.category as PlannerEvent["category"],
      startDate: row.start_date,
      endDate: row.end_date,
      participants: normalizeParticipants(row.participants),
    },
  };
}

export function eventToRow(
  event: PlannerEvent,
  semesterId: PlannerSemesterId,
  plannerScope: string,
): SupabaseEventRow {
  return {
    planner_scope: plannerScope,
    semester_id: event.startDate ? semesterId : null,
    event_id: event.id,
    title: event.title,
    description: event.description ?? null,
    category: event.category,
    start_date: event.startDate,
    end_date: event.endDate,
    participants: event.participants,
  };
}

export function eventsBySemesterToRows(
  eventsBySemester: PlannerEventsBySemester,
  plannerScope: string,
): SupabaseEventRow[] {
  const rows: SupabaseEventRow[] = [];

  for (const semesterId of plannerSemesterIds) {
    const semesterEvents = eventsBySemester[semesterId] ?? [];

    for (const event of semesterEvents) {
      rows.push(eventToRow(event, semesterId, plannerScope));
    }
  }

  return rows;
}

export function rowsToEventsBySemester(rows: SupabaseEventRow[]) {
  const eventsBySemester: PlannerEventsBySemester = {};

  for (const semesterId of plannerSemesterIds) {
    eventsBySemester[semesterId] = [];
  }

  for (const row of rows) {
    const parsed = rowToPlannerEvent(row);
    if (!parsed) {
      continue;
    }

    eventsBySemester[parsed.semesterId]?.push(parsed.event);
  }

  return eventsBySemester;
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

async function fetchSupabaseEventsBySemester(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
) {
  const endpoint = `${config.url}/rest/v1/${SUPABASE_EVENTS_TABLE}?select=planner_scope,semester_id,event_id,title,description,category,start_date,end_date,participants&planner_scope=eq.${encodeURIComponent(config.plannerScope)}`;

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

export async function insertSupabaseEvent(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  event: PlannerEvent,
  semesterId: PlannerSemesterId,
) {
  const row = eventToRow(event, semesterId, config.plannerScope);
  const endpoint = `${config.url}/rest/v1/${SUPABASE_EVENTS_TABLE}?on_conflict=planner_scope,event_id`;

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
      `Failed to insert planner event to Supabase: ${response.status} ${errorDetails}`,
    );
  }
}

export async function updateSupabaseEvent(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  eventId: string,
  patch: Partial<PlannerEvent> & { semesterId?: PlannerSemesterId },
) {
  const endpoint = `${config.url}/rest/v1/${SUPABASE_EVENTS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}&event_id=eq.${encodeURIComponent(eventId)}`;

  const body: Record<string, unknown> = {};

  if (patch.title !== undefined) body.title = patch.title;
  if (patch.description !== undefined) body.description = patch.description ?? null;
  if (patch.category !== undefined) body.category = patch.category;
  if (patch.startDate !== undefined) {
    body.start_date = patch.startDate;
    if (patch.semesterId !== undefined) {
      body.semester_id = patch.startDate ? patch.semesterId : null;
    }
  }
  if (patch.endDate !== undefined) body.end_date = patch.endDate;
  if (patch.participants !== undefined) body.participants = patch.participants;

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
      `Failed to update planner event in Supabase: ${response.status} ${errorDetails}`,
    );
  }
}

export async function deleteSupabaseEvent(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  eventId: string,
) {
  const endpoint = `${config.url}/rest/v1/${SUPABASE_EVENTS_TABLE}?planner_scope=eq.${encodeURIComponent(config.plannerScope)}&event_id=eq.${encodeURIComponent(eventId)}`;

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
      `Failed to delete planner event in Supabase: ${response.status} ${errorDetails}`,
    );
  }
}

export const supabasePlannerEventStore: PlannerEventStore = {
  async loadEventsBySemester() {
    const config = requireSupabaseConfig();
    return fetchSupabaseEventsBySemester(config);
  },

  async insertEvent(event, semesterId) {
    const config = requireSupabaseConfig();
    await insertSupabaseEvent(config, event, semesterId);
  },

  async updateEvent(eventId, patch) {
    const config = requireSupabaseConfig();
    await updateSupabaseEvent(config, eventId, patch);
  },

  async deleteEvent(eventId) {
    const config = requireSupabaseConfig();
    await deleteSupabaseEvent(config, eventId);
  },
};

/**
 * Resolves the calendar-event store implementation for the current runtime.
 */
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

