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
  saveEventsBySemester: (eventsBySemester: PlannerEventsBySemester) => Promise<void>;
};

export type PlannerStoreMode = "local" | "supabase";

const LOCAL_STORAGE_KEY_BASE = "sam.planner.events.v1";
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

function getLocalStorageKey() {
  const plannerScope = getPlannerScope();

  if (plannerScope === DEFAULT_PLANNER_SCOPE) {
    return LOCAL_STORAGE_KEY_BASE;
  }

  return `${LOCAL_STORAGE_KEY_BASE}.${plannerScope}`;
}

function isDateValue(value: unknown) {
  return value === null || typeof value === "string";
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

function isPlannerEvent(value: unknown): value is PlannerEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    isCategoryValue(candidate.category) &&
    isDateValue(candidate.startDate) &&
    isDateValue(candidate.endDate) &&
    Array.isArray(candidate.participants)
  );
}

function normalizeEventsBySemester(
  value: unknown,
): PlannerEventsBySemester | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const normalized: PlannerEventsBySemester = {};

  for (const semesterId of plannerSemesterIds) {
    const semesterValue = candidate[semesterId];

    if (semesterValue === undefined) {
      continue;
    }

    if (!Array.isArray(semesterValue)) {
      continue;
    }

    normalized[semesterId] = semesterValue.filter(isPlannerEvent).map((event) => ({
      ...event,
      participants: normalizeParticipants(event.participants),
    }));
  }

  return normalized;
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

export const localPlannerEventStore: PlannerEventStore = {
  async loadEventsBySemester() {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(getLocalStorageKey());

      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as unknown;
      return normalizeEventsBySemester(parsed);
    } catch {
      return null;
    }
  },

  async saveEventsBySemester(eventsBySemester) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const serialized = JSON.stringify(eventsBySemester);
      window.localStorage.setItem(getLocalStorageKey(), serialized);
    } catch {
      // Ignore write failures so planner interactions remain responsive.
    }
  },
};

function hasSupabaseClientConfig() {
  return Boolean(getSupabaseConfig());
}

export const supabasePlannerEventStore: PlannerEventStore = {
  async loadEventsBySemester() {
    const config = getSupabaseConfig();

    if (!config) {
      return null;
    }

    try {
      return await fetchSupabaseEventsBySemester(config);
    } catch {
      return null;
    }
  },

  async saveEventsBySemester(eventsBySemester) {
    const config = getSupabaseConfig();

    if (!config) {
      return;
    }

    try {
      await upsertSupabaseEventsBySemester(config, eventsBySemester);
    } catch {
      return;
    }
  },
};

function createSupabaseFallbackStore(): PlannerEventStore {
  let didLogSupabaseLoadSuccess = false;
  let didLogSupabaseLoadFallback = false;
  let didLogSupabaseSaveFallback = false;

  return {
    async loadEventsBySemester() {
      const supabaseEventsBySemester =
        await supabasePlannerEventStore.loadEventsBySemester();

      if (supabaseEventsBySemester) {
        if (!didLogSupabaseLoadSuccess) {
          logPersistenceHealth("Supabase load succeeded.");
          didLogSupabaseLoadSuccess = true;
        }
        return supabaseEventsBySemester;
      }

      if (!didLogSupabaseLoadFallback) {
        logPersistenceHealth(
          "Supabase load unavailable, falling back to local storage.",
        );
        didLogSupabaseLoadFallback = true;
      }

      return localPlannerEventStore.loadEventsBySemester();
    },

    async saveEventsBySemester(eventsBySemester) {
      // Persist locally first for resilience, then attempt remote sync.
      await localPlannerEventStore.saveEventsBySemester(eventsBySemester);

      const config = getSupabaseConfig();

      if (!config) {
        if (!didLogSupabaseSaveFallback) {
          logPersistenceHealth(
            "Supabase save skipped due to missing configuration; local storage remains active.",
          );
          didLogSupabaseSaveFallback = true;
        }
        return;
      }

      await supabasePlannerEventStore.saveEventsBySemester(eventsBySemester);
    },
  };
}

export function resolvePlannerEventStore(): PlannerEventStore {
  const configuredMode = process.env.NEXT_PUBLIC_SAM_PLANNER_STORE;
  const plannerScope = getPlannerScope();

  if (configuredMode === "supabase" && hasSupabaseClientConfig()) {
    logPersistenceHealth(
      `Store mode: supabase with local fallback enabled (scope: ${plannerScope}).`,
    );
    return createSupabaseFallbackStore();
  }

  logPersistenceHealth(`Store mode: local storage (scope: ${plannerScope}).`);
  return localPlannerEventStore;
}
