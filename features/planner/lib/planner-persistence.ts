import { plannerSemesterIds, type PlannerSemesterId } from "@/features/planner/lib/planner";

export type PlannerEventPlacement = {
  id: string;
  startDate: string | null;
  endDate: string | null;
};

export type PlannerPlacementsBySemester = Partial<
  Record<PlannerSemesterId, PlannerEventPlacement[]>
>;

export type PlannerEventStore = {
  loadPlacements: () => Promise<PlannerPlacementsBySemester | null>;
  savePlacements: (placements: PlannerPlacementsBySemester) => Promise<void>;
};

export type PlannerStoreMode = "local" | "supabase";

const LOCAL_STORAGE_KEY = "sam.planner.placements.v1";
const SUPABASE_PLACEMENTS_TABLE = "planner_event_placements";
const PERSISTENCE_LOG_PREFIX = "[SAM persistence]";

type SupabasePlacementRow = {
  semester_id: PlannerSemesterId;
  event_id: string;
  start_date: string | null;
  end_date: string | null;
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

function isDateValue(value: unknown) {
  return value === null || typeof value === "string";
}

function isPlacement(value: unknown): value is PlannerEventPlacement {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    isDateValue(candidate.startDate) &&
    isDateValue(candidate.endDate)
  );
}

function normalizePlacements(
  value: unknown,
): PlannerPlacementsBySemester | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const normalized: PlannerPlacementsBySemester = {};

  for (const semesterId of plannerSemesterIds) {
    const semesterValue = candidate[semesterId];

    if (semesterValue === undefined) {
      continue;
    }

    if (!Array.isArray(semesterValue)) {
      continue;
    }

    normalized[semesterId] = semesterValue.filter(isPlacement);
  }

  return normalized;
}

function placementsToRows(
  placements: PlannerPlacementsBySemester,
): SupabasePlacementRow[] {
  const rows: SupabasePlacementRow[] = [];

  for (const semesterId of plannerSemesterIds) {
    const semesterPlacements = placements[semesterId] ?? [];

    for (const placement of semesterPlacements) {
      rows.push({
        semester_id: semesterId,
        event_id: placement.id,
        start_date: placement.startDate,
        end_date: placement.endDate,
      });
    }
  }

  return rows;
}

function rowsToPlacements(rows: SupabasePlacementRow[]) {
  const placements: PlannerPlacementsBySemester = {};

  for (const semesterId of plannerSemesterIds) {
    const semesterRows = rows.filter((row) => row.semester_id === semesterId);

    if (semesterRows.length === 0) {
      continue;
    }

    placements[semesterId] = semesterRows.map((row) => ({
      id: row.event_id,
      startDate: row.start_date,
      endDate: row.end_date,
    }));
  }

  return placements;
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return {
    url,
    anonKey,
  };
}

async function fetchSupabasePlacements(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
) {
  const endpoint = `${config.url}/rest/v1/${SUPABASE_PLACEMENTS_TABLE}?select=semester_id,event_id,start_date,end_date`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load planner placements from Supabase.");
  }

  const rows = (await response.json()) as SupabasePlacementRow[];
  return rowsToPlacements(rows);
}

async function upsertSupabasePlacements(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  placements: PlannerPlacementsBySemester,
) {
  const rows = placementsToRows(placements);
  const endpoint = `${config.url}/rest/v1/${SUPABASE_PLACEMENTS_TABLE}?on_conflict=semester_id,event_id`;
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
    throw new Error("Failed to save planner placements to Supabase.");
  }
}

export const localPlannerEventStore: PlannerEventStore = {
  async loadPlacements() {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);

      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as unknown;
      return normalizePlacements(parsed);
    } catch {
      return null;
    }
  },

  async savePlacements(placements) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const serialized = JSON.stringify(placements);
      window.localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
    } catch {
      // Ignore write failures so planner interactions remain responsive.
    }
  },
};

function hasSupabaseClientConfig() {
  return Boolean(getSupabaseConfig());
}

export const supabasePlannerEventStore: PlannerEventStore = {
  async loadPlacements() {
    const config = getSupabaseConfig();

    if (!config) {
      return null;
    }

    try {
      return await fetchSupabasePlacements(config);
    } catch {
      return null;
    }
  },

  async savePlacements(placements) {
    const config = getSupabaseConfig();

    if (!config) {
      return;
    }

    try {
      await upsertSupabasePlacements(config, placements);
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
    async loadPlacements() {
      const supabasePlacements =
        await supabasePlannerEventStore.loadPlacements();

      if (supabasePlacements) {
        if (!didLogSupabaseLoadSuccess) {
          logPersistenceHealth("Supabase load succeeded.");
          didLogSupabaseLoadSuccess = true;
        }
        return supabasePlacements;
      }

      if (!didLogSupabaseLoadFallback) {
        logPersistenceHealth(
          "Supabase load unavailable, falling back to local storage.",
        );
        didLogSupabaseLoadFallback = true;
      }

      return localPlannerEventStore.loadPlacements();
    },

    async savePlacements(placements) {
      // Persist locally first for resilience, then attempt remote sync.
      await localPlannerEventStore.savePlacements(placements);

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

      await supabasePlannerEventStore.savePlacements(placements);
    },
  };
}

export function resolvePlannerEventStore(): PlannerEventStore {
  const configuredMode = process.env.NEXT_PUBLIC_SAM_PLANNER_STORE;

  if (configuredMode === "supabase" && hasSupabaseClientConfig()) {
    logPersistenceHealth("Store mode: supabase with local fallback enabled.");
    return createSupabaseFallbackStore();
  }

  logPersistenceHealth("Store mode: local storage.");
  return localPlannerEventStore;
}
