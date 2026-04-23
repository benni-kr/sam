import {
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
};

const SUPABASE_EVENTS_TABLE = "planner_events";
const PERSISTENCE_LOG_PREFIX = "[SAM persistence]";
const DEFAULT_PLANNER_SCOPE = "default";

type SupabaseEventRow = {
  planner_scope: string;
  semester_id: PlannerSemesterId;
  event_id: string;
  title: string;
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
        semester_id: semesterId,
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
    const semesterRows = rows.filter((row) => row.semester_id === semesterId);

    if (semesterRows.length === 0) {
      continue;
    }

    eventsBySemester[semesterId] = semesterRows
      .filter((row) => isCategoryValue(row.category))
      .map((row) => ({
        id: row.event_id,
        title: row.title,
        category: row.category as PlannerEvent["category"],
        startDate: row.start_date,
        endDate: row.end_date,
        participants: normalizeParticipants(row.participants),
      }));
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

function createSupabaseUnavailableStore(): PlannerEventStore {
  return {
    async loadEventsBySemester() {
      return null;
    },
    async saveEventsBySemester() {
      // Intentionally no-op when Supabase is not configured.
    },
  };
}

async function fetchSupabaseEventsBySemester(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
) {
  const endpoint = `${config.url}/rest/v1/${SUPABASE_EVENTS_TABLE}?select=planner_scope,semester_id,event_id,title,category,start_date,end_date,participants&planner_scope=eq.${encodeURIComponent(config.plannerScope)}`;
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
      Authorization: `Bearer ${config.anonKey}`,
    },
  });

  if (!deleteResponse.ok) {
    throw new Error("Failed to clear planner events in Supabase.");
  }

  if (rows.length === 0) {
    return;
  }

  const endpoint = `${config.url}/rest/v1/${SUPABASE_EVENTS_TABLE}?on_conflict=planner_scope,semester_id,event_id`;
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
    throw new Error("Failed to save planner events to Supabase.");
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
};

export function resolvePlannerEventStore(): PlannerEventStore {
  const plannerScope = getPlannerScope();

  if (!hasSupabaseConfig()) {
    if (process.env.NODE_ENV === "production") {
      requireSupabaseConfig();
    }

    logPersistenceHealth(
      `Supabase config missing; running without persistence in ${process.env.NODE_ENV ?? "unknown"} mode.`,
    );

    return createSupabaseUnavailableStore();
  }

  logPersistenceHealth(`Store mode: supabase only (scope: ${plannerScope}).`);
  return supabasePlannerEventStore;
}
