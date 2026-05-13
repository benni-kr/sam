"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  plannerEventCategories,
  type PlannerEvent,
  type PlannerEventCategory,
} from "@/features/planner/lib/planner";
import {
  plannerWeekEventCategories,
  type PlannerWeekEvent,
  type PlannerWeekEventCategory,
} from "@/features/weekly-schedule/lib/week-types";

const FILTER_STORAGE_KEY = "sam-filters";

export type ActivePanel = "search" | "participants" | "daterange" | "viewfilters" | null;

type PersistedFilters = {
  hiddenCategories: PlannerEventCategory[];
  hiddenWeekCategories: PlannerWeekEventCategory[];
  requiredParticipants: string[];
};

type FilterStateContextValue = {
  hiddenCategories: Set<PlannerEventCategory>;
  hiddenWeekCategories: Set<PlannerWeekEventCategory>;
  searchText: string;
  requiredParticipants: string[];
  filterStartDate: string;
  filterEndDate: string;
  filterStartTime: string;
  filterEndTime: string;
  isFiltering: boolean;
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;
  toggleCategory: (category: PlannerEventCategory) => void;
  toggleWeekCategory: (category: PlannerWeekEventCategory) => void;
  setSearchText: (text: string) => void;
  setFilterStartDate: (date: string) => void;
  setFilterEndDate: (date: string) => void;
  setFilterStartTime: (time: string) => void;
  setFilterEndTime: (time: string) => void;
  toggleParticipantFilter: (name: string) => void;
  syncParticipantFiltersToFriends: (validNames: string[]) => void;
  clearDateTimeRange: () => void;
  clearFilterPanel: () => void;
  clearAllFilters: () => void;
  applyFilters: (events: PlannerEvent[]) => PlannerEvent[];
  applyWeekFilters: (events: PlannerWeekEvent[]) => PlannerWeekEvent[];
};

const FilterStateContext = createContext<FilterStateContextValue | null>(null);

function loadPersistedFilters(): PersistedFilters {
  try {
    const stored = localStorage.getItem(FILTER_STORAGE_KEY);

    if (!stored) {
      return {
        hiddenCategories: [],
        hiddenWeekCategories: [],
        requiredParticipants: [],
      };
    }

    const parsed = JSON.parse(stored) as Partial<PersistedFilters>;

    const hiddenCategories = Array.isArray(parsed.hiddenCategories)
      ? parsed.hiddenCategories.filter((cat): cat is PlannerEventCategory =>
          plannerEventCategories.includes(cat as PlannerEventCategory),
        )
      : [];

    const hiddenWeekCategories = Array.isArray(parsed.hiddenWeekCategories)
      ? parsed.hiddenWeekCategories.filter(
          (cat): cat is PlannerWeekEventCategory =>
            plannerWeekEventCategories.includes(
              cat as PlannerWeekEventCategory,
            ),
        )
      : [];

    const requiredParticipants = Array.isArray(parsed.requiredParticipants)
      ? parsed.requiredParticipants.filter(
          (p): p is string => typeof p === "string",
        )
      : [];

    return { hiddenCategories, hiddenWeekCategories, requiredParticipants };
  } catch {
    return {
      hiddenCategories: [],
      hiddenWeekCategories: [],
      requiredParticipants: [],
    };
  }
}

function savePersistedFilters(filters: PersistedFilters) {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Ignore storage write errors silently
  }
}

export function FilterStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hiddenCategories, setHiddenCategories] = useState<
    Set<PlannerEventCategory>
  >(() => new Set());
  const [hiddenWeekCategories, setHiddenWeekCategories] = useState<
    Set<PlannerWeekEventCategory>
  >(() => new Set());
  const [searchText, setSearchTextState] = useState("");
  const [activePanel, setActivePanelState] = useState<ActivePanel>(null);
  const [requiredParticipants, setRequiredParticipants] = useState<string[]>(
    [],
  );
  const [filterStartDate, setFilterStartDateState] = useState("");
  const [filterEndDate, setFilterEndDateState] = useState("");
  const [filterStartTime, setFilterStartTimeState] = useState("");
  const [filterEndTime, setFilterEndTimeState] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = loadPersistedFilters();
    setHiddenCategories(new Set(stored.hiddenCategories));
    setHiddenWeekCategories(new Set(stored.hiddenWeekCategories));
    setRequiredParticipants(stored.requiredParticipants);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    savePersistedFilters({
      hiddenCategories: Array.from(hiddenCategories),
      hiddenWeekCategories: Array.from(hiddenWeekCategories),
      requiredParticipants,
    });
  }, [isHydrated, hiddenCategories, hiddenWeekCategories, requiredParticipants]);

  const toggleCategory = useCallback((category: PlannerEventCategory) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const toggleWeekCategory = useCallback(
    (category: PlannerWeekEventCategory) => {
      setHiddenWeekCategories((prev) => {
        const next = new Set(prev);
        if (next.has(category)) {
          next.delete(category);
        } else {
          next.add(category);
        }
        return next;
      });
    },
    [],
  );

  const setSearchText = useCallback((text: string) => {
    setSearchTextState(text);
  }, []);

  const setActivePanel = useCallback((panel: ActivePanel) => {
    setActivePanelState(panel);
  }, []);

  const setFilterStartDate = useCallback((date: string) => {
    setFilterStartDateState(date);
  }, []);

  const setFilterEndDate = useCallback((date: string) => {
    setFilterEndDateState(date);
  }, []);

  const setFilterStartTime = useCallback((time: string) => {
    setFilterStartTimeState(time);
  }, []);

  const setFilterEndTime = useCallback((time: string) => {
    setFilterEndTimeState(time);
  }, []);

  const toggleParticipantFilter = useCallback((name: string) => {
    setRequiredParticipants((prev) => {
      const lowerName = name.toLowerCase();
      const exists = prev.some((p) => p.toLowerCase() === lowerName);
      if (exists) {
        return prev.filter((p) => p.toLowerCase() !== lowerName);
      }
      return [...prev, name];
    });
  }, []);

  const syncParticipantFiltersToFriends = useCallback(
    (validNames: string[]) => {
      const validLower = new Set(validNames.map((n) => n.toLowerCase()));
      setRequiredParticipants((prev) =>
        prev.filter((p) => validLower.has(p.toLowerCase())),
      );
    },
    [],
  );

  const clearDateTimeRange = useCallback(() => {
    setFilterStartDateState("");
    setFilterEndDateState("");
    setFilterStartTimeState("");
    setFilterEndTimeState("");
  }, []);

  const clearFilterPanel = useCallback(() => {
    setSearchTextState("");
    setRequiredParticipants([]);
    setFilterStartDateState("");
    setFilterEndDateState("");
    setFilterStartTimeState("");
    setFilterEndTimeState("");
    setActivePanelState(null);
  }, []);

  const clearAllFilters = useCallback(() => {
    setHiddenCategories(new Set());
    setHiddenWeekCategories(new Set());
    setSearchTextState("");
    setRequiredParticipants([]);
    setFilterStartDateState("");
    setFilterEndDateState("");
    setFilterStartTimeState("");
    setFilterEndTimeState("");
    setActivePanelState(null);
  }, []);

  const value = useMemo<FilterStateContextValue>(() => {
    const isFiltering =
      hiddenCategories.size > 0 ||
      hiddenWeekCategories.size > 0 ||
      searchText.trim().length > 0 ||
      requiredParticipants.length > 0 ||
      filterStartDate.length > 0 ||
      filterEndDate.length > 0 ||
      filterStartTime.length > 0 ||
      filterEndTime.length > 0;

    function applyFilters(events: PlannerEvent[]): PlannerEvent[] {
      return events.filter((event) => {
        if (hiddenCategories.has(event.category)) return false;

        const normalizedSearch = searchText.trim().toLowerCase();
        if (
          normalizedSearch &&
          !event.title.toLowerCase().includes(normalizedSearch)
        ) {
          return false;
        }

        if (requiredParticipants.length > 0) {
          const eventParticipantsLower = event.participants.map((p) =>
            p.toLowerCase(),
          );
          const hasMatch = requiredParticipants.some((required) =>
            eventParticipantsLower.includes(required.toLowerCase()),
          );
          if (!hasMatch) return false;
        }

        if (filterStartDate || filterEndDate) {
          if (!event.startDate) return false;
          if (filterStartDate && event.startDate < filterStartDate) return false;
          const eventEnd = event.endDate ?? event.startDate;
          if (filterEndDate && eventEnd > filterEndDate) return false;
        }

        return true;
      });
    }

    function applyWeekFilters(events: PlannerWeekEvent[]): PlannerWeekEvent[] {
      return events.filter((event) => {
        if (hiddenWeekCategories.has(event.category)) return false;

        const normalizedSearch = searchText.trim().toLowerCase();
        if (
          normalizedSearch &&
          !event.title.toLowerCase().includes(normalizedSearch)
        ) {
          return false;
        }

        if (requiredParticipants.length > 0) {
          const eventParticipantsLower = event.participants.map((p) =>
            p.toLowerCase(),
          );
          const hasMatch = requiredParticipants.some((required) =>
            eventParticipantsLower.includes(required.toLowerCase()),
          );
          if (!hasMatch) return false;
        }

        if (filterStartTime && event.startTime < filterStartTime) return false;
        if (filterEndTime && event.endTime > filterEndTime) return false;

        return true;
      });
    }

    return {
      hiddenCategories,
      hiddenWeekCategories,
      searchText,
      requiredParticipants,
      filterStartDate,
      filterEndDate,
      filterStartTime,
      filterEndTime,
      isFiltering,
      activePanel,
      setActivePanel,
      toggleCategory,
      toggleWeekCategory,
      setSearchText,
      setFilterStartDate,
      setFilterEndDate,
      setFilterStartTime,
      setFilterEndTime,
      toggleParticipantFilter,
      syncParticipantFiltersToFriends,
      clearDateTimeRange,
      clearFilterPanel,
      clearAllFilters,
      applyFilters,
      applyWeekFilters,
    };
  }, [
    hiddenCategories,
    hiddenWeekCategories,
    searchText,
    requiredParticipants,
    filterStartDate,
    filterEndDate,
    filterStartTime,
    filterEndTime,
    activePanel,
    setActivePanel,
    toggleCategory,
    toggleWeekCategory,
    setSearchText,
    setFilterStartDate,
    setFilterEndDate,
    setFilterStartTime,
    setFilterEndTime,
    toggleParticipantFilter,
    syncParticipantFiltersToFriends,
    clearDateTimeRange,
    clearFilterPanel,
    clearAllFilters,
  ]);

  return (
    <FilterStateContext.Provider value={value}>
      {children}
    </FilterStateContext.Provider>
  );
}

export function useFilterState() {
  const context = useContext(FilterStateContext);

  if (!context) {
    throw new Error("useFilterState must be used inside FilterStateProvider.");
  }

  return context;
}
