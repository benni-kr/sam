"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import {
  resolvePlannerEventStore,
  type PlannerEventsBySemester,
  type PlannerWeekEventsBySemester,
} from "@/features/planner/lib/planner-persistence";
import { plannerWeekStateReducer } from "@/features/weekly-schedule/state/week-event-reducer";
import { useFriendsState } from "@/features/friends/state/friends-state";

import {
  defaultPlannerSemesterId,
  getPlannerSemester,
  plannerEventCategories,
  plannerSemesterIds,
  plannerSemesters,
  plannerWeekEventCategories,
  type PlannerCategorySummary,
  type PlannerEventCategory,
  type PlannerEvent,
  type PlannerMonth,
  type PlannerSemester,
  type PlannerSemesterId,
  type PlannerWeekEvent,
  type PlannerWeekEventCategory,
  type PlannerWeekday,
} from "@/features/planner/lib/planner";

type EventsBySemester = Record<PlannerSemesterId, PlannerEvent[]>;

type PlannerStateContextValue = {
  activeSemesterId: PlannerSemesterId;
  activeSemester: PlannerSemester;
  months: PlannerMonth[];
  events: PlannerEvent[];
  weekEvents: PlannerWeekEvent[];
  inboxEvents: PlannerEvent[];
  getEventsForDate: (dateKey: string) => PlannerEvent[];
  getEventsCoveringDate: (dateKey: string) => PlannerEvent[];
  getWeekEventsForDay: (day: PlannerWeekday) => PlannerWeekEvent[];
  categorySummaries: PlannerCategorySummary[];
  chronologicalEvents: PlannerEvent[];
  moveEventToDate: (eventId: string, dateKey: string) => void;
  moveEventToInbox: (eventId: string) => void;
  createEvent: (input: {
    title: string;
    category: PlannerEventCategory;
    startDate: string | null;
    endDate: string | null;
    participants: string[];
  }) => void;
  updateEvent: (
    eventId: string,
    input: {
      title: string;
      category: PlannerEventCategory;
      startDate: string | null;
      endDate: string | null;
      participants: string[];
    },
  ) => void;
  deleteEvent: (eventId: string) => void;
  createWeekEvent: (input: {
    title: string;
    category: PlannerWeekEventCategory;
    day: PlannerWeekday;
    startTime: string;
    endTime: string;
    participants: string[];
  }) => void;
  updateWeekEvent: (
    eventId: string,
    input: {
      title: string;
      category: PlannerWeekEventCategory;
      day: PlannerWeekday;
      startTime: string;
      endTime: string;
      participants: string[];
    },
  ) => void;
  deleteWeekEvent: (eventId: string) => void;
  toggleParticipant: (eventId: string, participantName: string) => void;
};

type PlannerStateProviderProps = {
  activeSemesterId: string;
  children: React.ReactNode;
};

type PlannerAction =
  | {
      type: "HYDRATE_FROM_STORE";
      payload: {
        eventsBySemester: PlannerEventsBySemester | null;
      };
    }
  | {
      type: "MOVE_EVENT_TO_DATE";
      payload: {
        eventId: string;
        dateKey: string;
        targetSemesterId: PlannerSemesterId;
      };
    }
  | {
      type: "MOVE_EVENT_TO_INBOX";
      payload: {
        eventId: string;
      };
    }
  | {
      type: "CREATE_EVENT";
      payload: {
        semesterId: PlannerSemesterId;
        event: PlannerEvent;
      };
    }
  | {
      type: "UPDATE_EVENT";
      payload: {
        eventId: string;
        title: string;
        category: PlannerEventCategory;
        startDate: string | null;
        endDate: string | null;
        participants: string[];
      };
    }
  | {
      type: "DELETE_EVENT";
      payload: {
        eventId: string;
      };
    }
  | {
      type: "TOGGLE_PARTICIPANT";
      payload: {
        eventId: string;
        participantName: string;
      };
    }
  | {
      type: "REMOVE_PARTICIPANT_FROM_ALL_EVENTS";
      payload: {
        participantName: string;
      };
    }
  | {
      type: "RENAME_PARTICIPANT_IN_ALL_EVENTS";
      payload: {
        currentName: string;
        nextName: string;
      };
    };

type WeekEventsBySemester = PlannerWeekEventsBySemester;

const PlannerStateContext = createContext<PlannerStateContextValue | null>(
  null,
);

/**
 * Converts a persisted date key to a stable midday Date instance.
 */
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

function normalizeDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate) {
    return {
      startDate: null,
      endDate: null,
    };
  }

  if (!endDate || endDate < startDate) {
    return {
      startDate,
      endDate: startDate,
    };
  }

  return {
    startDate,
    endDate,
  };
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
    acc[semester.id] = semester.events.map((event) => ({
      ...event,
      participants: [...event.participants],
    }));
    return acc;
  }, {} as EventsBySemester);
}

function initializeWeekEventsBySemester(): WeekEventsBySemester {
  return plannerSemesters.reduce((acc, semester) => {
    acc[semester.id] = semester.weekEvents.map((event) => ({
      ...event,
      participants: [...event.participants],
    }));
    return acc;
  }, {} as WeekEventsBySemester);
}

function normalizeFriendName(name: string) {
  return name.trim();
}

function dedupeParticipantNames(participants: string[]) {
  const uniqueByLowerCase = new Map<string, string>();

  for (const participant of participants) {
    const normalized = normalizeFriendName(participant);

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

function filterParticipantsByFriends(
  participants: string[],
  friends: string[],
) {
  const allowed = new Set(friends.map((friend) => friend.toLocaleLowerCase()));

  return dedupeParticipantNames(participants).filter((participant) =>
    allowed.has(participant.toLocaleLowerCase()),
  );
}

function buildEventsBySemesterSnapshot(
  eventsBySemester: EventsBySemester,
): PlannerEventsBySemester {
  return plannerSemesterIds.reduce((acc, semesterId) => {
    const semesterEvents = eventsBySemester[semesterId] ?? [];

    acc[semesterId] = semesterEvents.map((event) => ({
      ...event,
      participants: [...event.participants],
    }));

    return acc;
  }, {} as PlannerEventsBySemester);
}

function filterEventsByFriends(
  eventsBySemester: PlannerEventsBySemester,
  friends: string[],
) {
  return plannerSemesterIds.reduce((acc, semesterId) => {
    const semesterEvents = eventsBySemester[semesterId] ?? [];

    acc[semesterId] = semesterEvents.map((event) => ({
      ...event,
      participants: filterParticipantsByFriends(event.participants, friends),
    }));

    return acc;
  }, {} as PlannerEventsBySemester);
}

function buildWeekEventsBySemesterSnapshot(
  weekEventsBySemester: PlannerWeekEventsBySemester,
): PlannerWeekEventsBySemester {
  return plannerSemesterIds.reduce((acc, semesterId) => {
    const semesterEvents = weekEventsBySemester[semesterId] ?? [];

    acc[semesterId] = semesterEvents.map((event) => ({
      ...event,
      participants: [...event.participants],
    }));

    return acc;
  }, {} as PlannerWeekEventsBySemester);
}

function filterWeekEventsByFriends(
  weekEventsBySemester: PlannerWeekEventsBySemester,
  friends: string[],
) {
  return plannerSemesterIds.reduce((acc, semesterId) => {
    const semesterEvents = weekEventsBySemester[semesterId] ?? [];

    acc[semesterId] = semesterEvents.map((event) => ({
      ...event,
      participants: filterParticipantsByFriends(event.participants, friends),
    }));

    return acc;
  }, {} as PlannerWeekEventsBySemester);
}

function toPlannerPersistenceError(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

function findSemesterForEvent(
  eventsBySemester: EventsBySemester,
  eventId: string,
): PlannerSemesterId | null {
  for (const semesterId of plannerSemesterIds) {
    const semesterEvents = eventsBySemester[semesterId] ?? [];

    if (semesterEvents.some((event) => event.id === eventId)) {
      return semesterId;
    }
  }

  return null;
}

export function getInboxEventsFromState(eventsBySemester: EventsBySemester) {
  return plannerSemesterIds
    .flatMap((semesterId) => eventsBySemester[semesterId] ?? [])
    .filter((event) => !event.startDate)
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function plannerStateReducer(
  state: EventsBySemester,
  action: PlannerAction,
): EventsBySemester {
  switch (action.type) {
    case "HYDRATE_FROM_STORE": {
      const { eventsBySemester } = action.payload;

      if (!eventsBySemester) {
        return state;
      }

      const nextState: EventsBySemester = { ...state };

      for (const semesterId of plannerSemesterIds) {
        const semesterEvents = eventsBySemester[semesterId] ?? [];
        nextState[semesterId] = semesterEvents.map((event) => ({
          ...event,
          participants: [...event.participants],
        }));
      }

      return nextState;
    }

    case "MOVE_EVENT_TO_DATE": {
      const { eventId, dateKey, targetSemesterId } = action.payload;
      const sourceSemesterId = findSemesterForEvent(state, eventId);

      if (!sourceSemesterId) {
        return state;
      }

      const sourceEvents = state[sourceSemesterId] ?? [];
      const targetEvents = state[targetSemesterId] ?? [];
      const event = sourceEvents.find((item) => item.id === eventId);

      if (!event) {
        return state;
      }

      const duration = eventDurationInDays(event);
      const nextStartDate = dateKey;
      const nextEndDate = toDateKey(addDays(toDate(dateKey), duration - 1));
      const updatedEvent: PlannerEvent = {
        ...event,
        startDate: nextStartDate,
        endDate: nextEndDate,
      };

      // If an inbox event is scheduled from another semester, rehome it into the
      // currently active semester so it appears in the visible calendar.
      if (sourceSemesterId !== targetSemesterId) {
        return {
          ...state,
          [sourceSemesterId]: sourceEvents.filter(
            (item) => item.id !== eventId,
          ),
          [targetSemesterId]: [...targetEvents, updatedEvent],
        };
      }

      return {
        ...state,
        [targetSemesterId]: targetEvents.map((item) => {
          if (item.id !== eventId) {
            return item;
          }

          return updatedEvent;
        }),
      };
    }

    case "MOVE_EVENT_TO_INBOX": {
      const { eventId } = action.payload;
      const semesterId = findSemesterForEvent(state, eventId);

      if (!semesterId) {
        return state;
      }

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

    case "CREATE_EVENT": {
      const { semesterId, event } = action.payload;
      const semesterEvents = state[semesterId] ?? [];

      return {
        ...state,
        [semesterId]: [...semesterEvents, event],
      };
    }

    case "UPDATE_EVENT": {
      const semesterId = findSemesterForEvent(state, action.payload.eventId);

      if (!semesterId) {
        return state;
      }

      const semesterEvents = state[semesterId] ?? [];

      return {
        ...state,
        [semesterId]: semesterEvents.map((event) => {
          if (event.id !== action.payload.eventId) {
            return event;
          }

          return {
            ...event,
            title: action.payload.title,
            category: action.payload.category,
            startDate: action.payload.startDate,
            endDate: action.payload.endDate,
            participants: action.payload.participants,
          };
        }),
      };
    }

    case "DELETE_EVENT": {
      const semesterId = findSemesterForEvent(state, action.payload.eventId);

      if (!semesterId) {
        return state;
      }

      const semesterEvents = state[semesterId] ?? [];

      return {
        ...state,
        [semesterId]: semesterEvents.filter(
          (event) => event.id !== action.payload.eventId,
        ),
      };
    }

    case "TOGGLE_PARTICIPANT": {
      const { eventId, participantName } = action.payload;
      const trimmedName = participantName.trim();

      if (!trimmedName) {
        return state;
      }

      const semesterId = findSemesterForEvent(state, eventId);

      if (!semesterId) {
        return state;
      }

      const semesterEvents = state[semesterId] ?? [];

      return {
        ...state,
        [semesterId]: semesterEvents.map((event) => {
          if (event.id !== eventId) {
            return event;
          }

          const hasParticipant = event.participants.includes(trimmedName);

          return {
            ...event,
            participants: hasParticipant
              ? event.participants.filter((name) => name !== trimmedName)
              : [...event.participants, trimmedName],
          };
        }),
      };
    }

    case "REMOVE_PARTICIPANT_FROM_ALL_EVENTS": {
      const target = action.payload.participantName.toLocaleLowerCase();

      return plannerSemesterIds.reduce((nextState, semesterId) => {
        const semesterEvents = state[semesterId] ?? [];

        nextState[semesterId] = semesterEvents.map((event) => ({
          ...event,
          participants: event.participants.filter(
            (participant) => participant.toLocaleLowerCase() !== target,
          ),
        }));

        return nextState;
      }, {} as EventsBySemester);
    }

    case "RENAME_PARTICIPANT_IN_ALL_EVENTS": {
      const currentName = action.payload.currentName.toLocaleLowerCase();
      const nextName = action.payload.nextName;

      return plannerSemesterIds.reduce((nextState, semesterId) => {
        const semesterEvents = state[semesterId] ?? [];

        nextState[semesterId] = semesterEvents.map((event) => ({
          ...event,
          participants: dedupeParticipantNames(
            event.participants.map((participant) =>
              participant.toLocaleLowerCase() === currentName
                ? nextName
                : participant,
            ),
          ),
        }));

        return nextState;
      }, {} as EventsBySemester);
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

function eventCoversDate(event: PlannerEvent, dateKey: string) {
  if (!event.startDate) {
    return false;
  }

  const endDate = event.endDate ?? event.startDate;

  return event.startDate <= dateKey && endDate >= dateKey;
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
  const [weekEventsBySemester, dispatchWeek] = useReducer(
    plannerWeekStateReducer,
    undefined,
    initializeWeekEventsBySemester,
  );
  const [didHydrateFromStorage, setDidHydrateFromStorage] = useState(false);
  const eventStore = useRef(resolvePlannerEventStore());
  const [persistenceError, setPersistenceError] = useState<Error | null>(null);
  const { friends, lastMutation } = useFriendsState();

  if (persistenceError) {
    throw persistenceError;
  }

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      eventStore.current.loadEventsBySemester(),
      eventStore.current.loadWeekEventsBySemester(),
    ])
      .then(([eventsBySemester, weekEventsBySemester]) => {
        if (cancelled) {
          return;
        }

        dispatch({
          type: "HYDRATE_FROM_STORE",
          payload: {
            eventsBySemester: eventsBySemester
              ? filterEventsByFriends(eventsBySemester, friends)
              : eventsBySemester,
          },
        });

        dispatchWeek({
          type: "HYDRATE_WEEK_FROM_STORE",
          payload: {
            weekEventsBySemester: weekEventsBySemester
              ? filterWeekEventsByFriends(weekEventsBySemester, friends)
              : weekEventsBySemester,
          },
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPersistenceError(
            toPlannerPersistenceError(
              error,
              "Failed to hydrate planner data from Supabase.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDidHydrateFromStorage(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [friends]);

  useEffect(() => {
    if (!didHydrateFromStorage || !lastMutation) {
      return;
    }

    if (lastMutation.type === "rename") {
      dispatch({
        type: "RENAME_PARTICIPANT_IN_ALL_EVENTS",
        payload: {
          currentName: lastMutation.currentName,
          nextName: lastMutation.nextName,
        },
      });
    }

    if (lastMutation.type === "remove") {
      dispatch({
        type: "REMOVE_PARTICIPANT_FROM_ALL_EVENTS",
        payload: { participantName: lastMutation.name },
      });
    }
  }, [didHydrateFromStorage, lastMutation]);

  useEffect(() => {
    if (!didHydrateFromStorage) {
      return;
    }

    const snapshot = buildEventsBySemesterSnapshot(eventsBySemester);
    void eventStore.current
      .saveEventsBySemester(snapshot)
      .catch((error: unknown) => {
        setPersistenceError(
          toPlannerPersistenceError(
            error,
            "Failed to persist planner events to Supabase.",
          ),
        );
      });
  }, [didHydrateFromStorage, eventsBySemester]);

  useEffect(() => {
    if (!didHydrateFromStorage) {
      return;
    }

    const snapshot = buildWeekEventsBySemesterSnapshot(weekEventsBySemester);
    void eventStore.current
      .saveWeekEventsBySemester(snapshot)
      .catch((error: unknown) => {
        setPersistenceError(
          toPlannerPersistenceError(
            error,
            "Failed to persist planner week events to Supabase.",
          ),
        );
      });
  }, [didHydrateFromStorage, weekEventsBySemester]);

  const normalizedSemesterId = (
    plannerSemesters.some((semester) => semester.id === activeSemesterId)
      ? activeSemesterId
      : defaultPlannerSemesterId
  ) as PlannerSemesterId;

  const activeSemester = getPlannerSemester(normalizedSemesterId);
  const events =
    eventsBySemester[normalizedSemesterId] ?? activeSemester.events;
  const weekEvents =
    weekEventsBySemester[normalizedSemesterId] ?? activeSemester.weekEvents;
  const inboxEvents = getInboxEventsFromState(eventsBySemester);

  const value = useMemo<PlannerStateContextValue>(() => {
    const categorySummaries = buildCategorySummaries(events);
    const chronologicalEvents = sortChronological(events);

    return {
      activeSemesterId: normalizedSemesterId,
      activeSemester,
      months: activeSemester.months,
      events,
      weekEvents,
      inboxEvents,
      getEventsForDate: (dateKey) =>
        events.filter((event) => event.startDate === dateKey),
      getEventsCoveringDate: (dateKey) =>
        events.filter((event) => eventCoversDate(event, dateKey)),
      getWeekEventsForDay: (day) =>
        weekEvents.filter((event) => event.day === day),
      categorySummaries,
      chronologicalEvents,
      moveEventToDate: (eventId, dateKey) => {
        dispatch({
          type: "MOVE_EVENT_TO_DATE",
          payload: { eventId, dateKey, targetSemesterId: normalizedSemesterId },
        });
      },
      moveEventToInbox: (eventId) => {
        dispatch({
          type: "MOVE_EVENT_TO_INBOX",
          payload: { eventId },
        });
      },
      createEvent: (input) => {
        const title = input.title.trim();

        if (!title || !plannerEventCategories.includes(input.category)) {
          return;
        }

        const normalizedDates = normalizeDateRange(
          input.startDate,
          input.endDate,
        );

        dispatch({
          type: "CREATE_EVENT",
          payload: {
            semesterId: normalizedSemesterId,
            event: {
              id: `evt-${crypto.randomUUID()}`,
              title,
              category: input.category,
              startDate: normalizedDates.startDate,
              endDate: normalizedDates.endDate,
              participants: filterParticipantsByFriends(
                input.participants,
                friends,
              ),
            },
          },
        });
      },
      updateEvent: (eventId, input) => {
        const title = input.title.trim();

        if (!title || !plannerEventCategories.includes(input.category)) {
          return;
        }

        const normalizedDates = normalizeDateRange(
          input.startDate,
          input.endDate,
        );

        dispatch({
          type: "UPDATE_EVENT",
          payload: {
            eventId,
            title,
            category: input.category,
            startDate: normalizedDates.startDate,
            endDate: normalizedDates.endDate,
            participants: filterParticipantsByFriends(
              input.participants,
              friends,
            ),
          },
        });
      },
      deleteEvent: (eventId) => {
        dispatch({
          type: "DELETE_EVENT",
          payload: { eventId },
        });
      },
      createWeekEvent: (input) => {
        const title = input.title.trim();

        if (!title || !plannerWeekEventCategories.includes(input.category)) {
          return;
        }

        dispatchWeek({
          type: "CREATE_WEEK_EVENT",
          payload: {
            semesterId: normalizedSemesterId,
            event: {
              id: `wevt-${crypto.randomUUID()}`,
              title,
              category: input.category,
              day: input.day,
              startTime: input.startTime,
              endTime: input.endTime,
              participants: filterParticipantsByFriends(
                input.participants,
                friends,
              ),
            },
          },
        });
      },
      updateWeekEvent: (eventId, input) => {
        const title = input.title.trim();

        if (!title || !plannerWeekEventCategories.includes(input.category)) {
          return;
        }

        dispatchWeek({
          type: "UPDATE_WEEK_EVENT",
          payload: {
            eventId,
            title,
            category: input.category,
            day: input.day,
            startTime: input.startTime,
            endTime: input.endTime,
            participants: filterParticipantsByFriends(
              input.participants,
              friends,
            ),
          },
        });
      },
      deleteWeekEvent: (eventId) => {
        dispatchWeek({
          type: "DELETE_WEEK_EVENT",
          payload: { eventId },
        });
      },
      toggleParticipant: (eventId, participantName) => {
        const normalizedName = normalizeFriendName(participantName);

        if (
          !normalizedName ||
          !friends.some(
            (friend) =>
              friend.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
          )
        ) {
          return;
        }

        dispatch({
          type: "TOGGLE_PARTICIPANT",
          payload: { eventId, participantName: normalizedName },
        });
      },
    };
  }, [
    activeSemester,
    events,
    friends,
    inboxEvents,
    normalizedSemesterId,
    weekEvents,
  ]);

  return (
    <PlannerStateContext.Provider value={value}>
      {children}
    </PlannerStateContext.Provider>
  );
}

/**
 * Accessor hook for planner state and actions.
 */
export function usePlannerState() {
  const context = useContext(PlannerStateContext);

  if (!context) {
    throw new Error(
      "usePlannerState must be used inside PlannerStateProvider.",
    );
  }

  return context;
}
