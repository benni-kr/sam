import { plannerSemesterIds, type PlannerSemesterId } from "@/lib/planner";

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
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

// Stub adapter for future backend wiring.
// For now it intentionally does nothing so behavior stays local-first.
export const supabasePlannerEventStore: PlannerEventStore = {
  async loadPlacements() {
    return null;
  },

  async savePlacements(placements) {
    void placements;
    return;
  },
};

export function resolvePlannerEventStore(): PlannerEventStore {
  const configuredMode = process.env.NEXT_PUBLIC_SAM_PLANNER_STORE;

  if (configuredMode === "supabase" && hasSupabaseClientConfig()) {
    return supabasePlannerEventStore;
  }

  return localPlannerEventStore;
}
