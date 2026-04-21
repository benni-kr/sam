"use client";

import { createContext, useContext, useMemo, useReducer } from "react";

import {
  defaultPlannerSemesterId,
  getPlannerSemester,
  plannerSemesters,
  type PlannerCategorySummary,
  type PlannerEvent,
  type PlannerMonth,
  type PlannerSemester,
  type PlannerSemesterId,
} from "@/lib/planner";

type EventsBySemester = Record<PlannerSemesterId, PlannerEvent[]>;

type PlannerStateContextValue = {
  activeSemesterId: PlannerSemesterId;
  activeSemester: PlannerSemester;
  months: PlannerMonth[];
  events: PlannerEvent[];
  inboxEvents: PlannerEvent[];
  getEventsForDate: (dateKey: string) => PlannerEvent[];
  categorySummaries: PlannerCategorySummary[];
  chronologicalEvents: PlannerEvent[];
  moveEventToDate: (eventId: string, dateKey: string) => void;
  moveEventToInbox: (eventId: string) => void;
};

type PlannerStateProviderProps = {
  activeSemesterId: string;
  children: React.ReactNode;
};

type PlannerAction =
  | {
      type: "MOVE_EVENT_TO_DATE";
      payload: {
        semesterId: PlannerSemesterId;
        eventId: string;
        dateKey: string;
      };
    }
  | {
      type: "MOVE_EVENT_TO_INBOX";
      payload: {
        semesterId: PlannerSemesterId;
        eventId: string;
      };
    };

const PlannerStateContext = createContext<PlannerStateContextValue | null>(
  null,
);

function toDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function eventDurationInDays(event: PlannerEvent) {
  if (!event.startDate || !event.endDate) {
    return 1;
  }

  const start = toDate(event.startDate);
  const end = toDate(event.endDate);
  const durationMs = end.getTime() - start.getTime();

  return Math.max(1, Math.floor(durationMs / (1000 * 60 * 60 * 24)) + 1);
}

function initializeEventsBySemester(): EventsBySemester {
  return plannerSemesters.reduce((acc, semester) => {
    acc[semester.id] = semester.events;
    return acc;
  }, {} as EventsBySemester);
}

function plannerStateReducer(
  state: EventsBySemester,
  action: PlannerAction,
): EventsBySemester {
  switch (action.type) {
    case "MOVE_EVENT_TO_DATE": {
      const { semesterId, eventId, dateKey } = action.payload;
      const semesterEvents = state[semesterId] ?? [];

      return {
        ...state,
        [semesterId]: semesterEvents.map((event) => {
          if (event.id !== eventId) {
            return event;
          }

          const duration = eventDurationInDays(event);
          const nextStartDate = dateKey;
          const nextEndDate = toDateKey(addDays(toDate(dateKey), duration - 1));

          return {
            ...event,
            startDate: nextStartDate,
            endDate: nextEndDate,
          };
        }),
      };
    }

    case "MOVE_EVENT_TO_INBOX": {
      const { semesterId, eventId } = action.payload;
      const semesterEvents = state[semesterId] ?? [];

      return {
        ...state,
        [semesterId]: semesterEvents.map((event) => {
          if (event.id !== eventId) {
            return event;
          }

          return {
            ...event,
            startDate: null,
            endDate: null,
          };
        }),
      };
    }

    default:
      return state;
  }
}

function buildCategorySummaries(
  events: PlannerEvent[],
): PlannerCategorySummary[] {
  const categories = new Set(events.map((event) => event.category));

  return Array.from(categories).map((category) => {
    const categoryEvents = events.filter(
      (event) => event.category === category,
    );
    const participants = Array.from(
      new Set(categoryEvents.flatMap((event) => event.participants)),
    );

    return {
      category,
      count: categoryEvents.length,
      participants,
      events: categoryEvents,
    };
  });
}

function sortChronological(events: PlannerEvent[]): PlannerEvent[] {
  return [...events].sort((left, right) => {
    if (left.startDate === null && right.startDate === null) {
      return left.title.localeCompare(right.title);
    }

    if (left.startDate === null) {
      return 1;
    }

    if (right.startDate === null) {
      return -1;
    }

    const dateComparison = left.startDate.localeCompare(right.startDate);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    if (left.endDate === null && right.endDate === null) {
      return left.title.localeCompare(right.title);
    }

    if (left.endDate === null) {
      return 1;
    }

    if (right.endDate === null) {
      return -1;
    }

    const endDateComparison = left.endDate.localeCompare(right.endDate);

    if (endDateComparison !== 0) {
      return endDateComparison;
    }

    return left.title.localeCompare(right.title);
  });
}

export function PlannerStateProvider({
  activeSemesterId,
  children,
}: PlannerStateProviderProps) {
  const [eventsBySemester, dispatch] = useReducer(
    plannerStateReducer,
    undefined,
    initializeEventsBySemester,
  );

  const normalizedSemesterId = (
    plannerSemesters.some((semester) => semester.id === activeSemesterId)
      ? activeSemesterId
      : defaultPlannerSemesterId
  ) as PlannerSemesterId;

  const activeSemester = getPlannerSemester(normalizedSemesterId);
  const events =
    eventsBySemester[normalizedSemesterId] ?? activeSemester.events;

  const value = useMemo<PlannerStateContextValue>(() => {
    const inboxEvents = events.filter((event) => !event.startDate);
    const categorySummaries = buildCategorySummaries(events);
    const chronologicalEvents = sortChronological(events);

    return {
      activeSemesterId: normalizedSemesterId,
      activeSemester,
      months: activeSemester.months,
      events,
      inboxEvents,
      getEventsForDate: (dateKey) =>
        events.filter((event) => event.startDate === dateKey),
      categorySummaries,
      chronologicalEvents,
      moveEventToDate: (eventId, dateKey) => {
        dispatch({
          type: "MOVE_EVENT_TO_DATE",
          payload: { semesterId: normalizedSemesterId, eventId, dateKey },
        });
      },
      moveEventToInbox: (eventId) => {
        dispatch({
          type: "MOVE_EVENT_TO_INBOX",
          payload: { semesterId: normalizedSemesterId, eventId },
        });
      },
    };
  }, [activeSemester, events, normalizedSemesterId]);

  return (
    <PlannerStateContext.Provider value={value}>
      {children}
    </PlannerStateContext.Provider>
  );
}

export function usePlannerState() {
  const context = useContext(PlannerStateContext);

  if (!context) {
    throw new Error(
      "usePlannerState must be used inside PlannerStateProvider.",
    );
  }

  return context;
}
