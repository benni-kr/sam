"use client";

/**
 * Planner State
 *
 * This module coordinates planner hydration, local reducer state, persistence
 * writes, and derived selectors for both calendar and weekly schedule views.
 */

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
  rowToPlannerEvent,
  type PlannerEventsBySemester,
  type SupabaseEventRow,
} from "@/features/planner/lib/planner-persistence";
import {
  isOfflineError,
  readSnapshot,
  writeSnapshot,
} from "@/features/planner/lib/offline-cache";
import {
  resolveWeekEventStore,
  rowToPlannerWeekEvent,
  type PlannerWeekEventsBySemester,
  type SupabaseWeekEventRow,
} from "@/features/weekly-schedule/lib/week-persistence";
import { plannerWeekStateReducer } from "@/features/weekly-schedule/state/week-event-reducer";
import { useFriendsState } from "@/features/friends/state/friends-state";
import {
  type NotificationItem,
} from "@/features/notifications/lib/notification-diff";
import { broadcastNotifications } from "@/features/notifications/lib/notify-broadcast";
import { getActiveSubscriptionEndpoint } from "@/features/notifications/lib/push-subscription";
import {
  ensureRealtimeAuth,
  getSupabaseBrowserClient,
  getSupabaseConfig,
} from "@/lib/supabase/client";

import {
  defaultPlannerSemesterId,
  getPlannerSemester,
  plannerEventCategories,
  plannerSemesterIds,
  plannerSemesters,
  type PlannerCategorySummary,
  type PlannerEventCategory,
  type PlannerEvent,
  type PlannerMonth,
  type PlannerSemester,
  type PlannerSemesterId,
} from "@/features/planner/lib/planner";
import {
  plannerWeekEventCategories,
  type PlannerWeekEvent,
  type PlannerWeekEventCategory,
  type PlannerWeekday,
} from "@/features/weekly-schedule/lib/week-types";

/** Offline snapshot keys; namespaced per planner scope by the cache module. */
const EVENTS_SNAPSHOT_KEY = "planner-events";
const WEEK_EVENTS_SNAPSHOT_KEY = "week-events";

type EventsBySemester = Record<PlannerSemesterId, PlannerEvent[]>;

type PlannerStateContextValue = {
  /**
   * True while the data on screen came from the offline snapshot rather than
   * Supabase. The app is read-only in this state: writes are suppressed because
   * persisting cache-hydrated state would prune real rows.
   */
  isOffline: boolean;
  /** ISO timestamp the visible data was last known to be current, if known. */
  lastSyncedAt: string | null;
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
    description?: string;
    category: PlannerEventCategory;
    startDate: string | null;
    endDate: string | null;
    participants: string[];
  }) => void;
  updateEvent: (
    eventId: string,
    input: {
      title: string;
      description?: string;
      category: PlannerEventCategory;
      startDate: string | null;
      endDate: string | null;
      participants: string[];
    },
  ) => void;
  deleteEvent: (eventId: string) => void;
  createWeekEvent: (input: {
    title: string;
    description?: string;
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
      description?: string;
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
      /** Hydrates the calendar semester map from persistence. */
      type: "HYDRATE_FROM_STORE";
      payload: {
        /** Semester-keyed calendar events loaded from Supabase. */
        eventsBySemester: PlannerEventsBySemester | null;
      };
    }
  | {
      /** Moves a calendar event from the inbox into a dated calendar slot. */
      type: "MOVE_EVENT_TO_DATE";
      payload: {
        /** Event identifier from the semester store. */
        eventId: string;
        /** Target date in YYYY-MM-DD format. */
        dateKey: string;
        /** Semester that should receive the updated event. */
        targetSemesterId: PlannerSemesterId;
      };
    }
  | {
      /** Returns a dated calendar event back to the inbox. */
      type: "MOVE_EVENT_TO_INBOX";
      payload: {
        /** Event identifier from the semester store. */
        eventId: string;
      };
    }
  | {
      /** Creates a new semester-scoped calendar event. */
      type: "CREATE_EVENT";
      payload: {
        /** Semester that owns the new event. */
        semesterId: PlannerSemesterId;
        /** Fully formed event object ready for persistence. */
        event: PlannerEvent;
      };
    }
  | {
      /** Updates an existing calendar event in place. */
      type: "UPDATE_EVENT";
      payload: {
        /** Event identifier from the semester store. */
        eventId: string;
        /** Updated display title. */
        title: string;
        /** Updated optional description shown in previews and details. */
        description?: string;
        /** Updated planner category used for theming and filtering. */
        category: PlannerEventCategory;
        /** Updated inclusive start date in YYYY-MM-DD format, or null for inbox items. */
        startDate: string | null;
        /** Updated inclusive end date in YYYY-MM-DD format, or null for inbox items. */
        endDate: string | null;
        /** Updated participant list, normalized against the friends domain. */
        participants: string[];
      };
    }
  | {
      /** Deletes an event from the current semester store. */
      type: "DELETE_EVENT";
      payload: {
        /** Event identifier from the semester store. */
        eventId: string;
      };
    }
  | {
      /** Toggles a participant name on a calendar event. */
      type: "TOGGLE_PARTICIPANT";
      payload: {
        /** Event identifier from the semester store. */
        eventId: string;
        /** Participant name as entered by the user. */
        participantName: string;
      };
    }
  | {
      /** Removes one participant from every calendar event. */
      type: "REMOVE_PARTICIPANT_FROM_ALL_EVENTS";
      payload: {
        /** Participant name to remove case-insensitively. */
        participantName: string;
      };
    }
  | {
      /** Renames one participant across the entire calendar store. */
      type: "RENAME_PARTICIPANT_IN_ALL_EVENTS";
      payload: {
        /** Existing participant name to replace case-insensitively. */
        currentName: string;
        /** Replacement participant name stored in normalized form. */
        nextName: string;
      };
    }
  | {
      /** Handles remote upsert (insert or update) from Realtime broadcast. */
      type: "REMOTE_UPSERT_EVENT";
      payload: {
        semesterId: PlannerSemesterId;
        event: PlannerEvent;
      };
    }
  | {
      /** Handles remote deletion from Realtime broadcast. */
      type: "REMOTE_DELETE_EVENT";
      payload: {
        eventId: string;
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
  // Prevent invalid time-travel states: if the user picks an end date before
  // the start date, we force the range to collapse to the start date so the
  // event always remains a valid forward-moving interval.
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

/**
 * Extracts and sorts all undated events across semesters for the inbox view.
 */
export function getInboxEventsFromState(eventsBySemester: EventsBySemester) {
  return plannerSemesterIds
    .flatMap((semesterId) => eventsBySemester[semesterId] ?? [])
    .filter((event) => !event.startDate)
    .sort((left, right) => left.title.localeCompare(right.title));
}

/**
 * Applies planner calendar mutations to the semester-scoped event state tree.
 */
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
            description: action.payload.description,
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

    case "REMOTE_UPSERT_EVENT": {
      const { semesterId, event } = action.payload;
      const existingSemesterId = findSemesterForEvent(state, event.id);

      if (existingSemesterId && existingSemesterId !== semesterId) {
        const sourceEvents = (state[existingSemesterId] ?? []).filter(
          (item) => item.id !== event.id,
        );
        const targetEvents = state[semesterId] ?? [];
        return {
          ...state,
          [existingSemesterId]: sourceEvents,
          [semesterId]: [
            ...targetEvents.filter((item) => item.id !== event.id),
            event,
          ],
        };
      }

      const currentEvents = state[semesterId] ?? [];
      const exists = currentEvents.some((item) => item.id === event.id);

      return {
        ...state,
        [semesterId]: exists
          ? currentEvents.map((item) => (item.id === event.id ? event : item))
          : [...currentEvents, event],
      };
    }

    case "REMOTE_DELETE_EVENT": {
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

/**
 * Provides the planner state tree, reducer actions, and derived selectors to
 * all planner routes.
 */
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
  const weekEventStore = useRef(resolveWeekEventStore());
  const [persistenceError, setPersistenceError] = useState<Error | null>(null);
  // Offline mode: the data on screen came from the local snapshot instead of
  // Supabase. While this is set the app is read-only — see the save effects.
  const [isOffline, setIsOffline] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  // Bumped by the `online` event to re-run the load effect after reconnecting.
  const [reloadToken, setReloadToken] = useState(0);
  // This device's own push endpoint, excluded from its own broadcasts.
  const ownEndpointRef = useRef<string | null>(null);
  const {
    friendNames,
    isHydrated: friendsHydrated,
    lastMutation,
  } = useFriendsState();

  if (persistenceError) {
    throw persistenceError;
  }

  useEffect(() => {
    if (!friendsHydrated) {
      return;
    }

    let cancelled = false;

    // Two-argument then, deliberately not .then().catch(): a chained catch also
    // swallows anything thrown by the success handler, and a TypeError from a
    // bug in our own code would then be misread as "offline" and quietly
    // replace live data with the snapshot. This way only the load itself can
    // trigger the offline path.
    void Promise.all([
      eventStore.current.loadEventsBySemester(),
      weekEventStore.current.loadWeekEventsBySemester(),
    ]).then(
      ([eventsBySemester, weekEventsBySemester]) => {
        if (cancelled) {
          return;
        }

        if (eventsBySemester) {
          dispatch({
            type: "HYDRATE_FROM_STORE",
            payload: { eventsBySemester },
          });

          writeSnapshot(EVENTS_SNAPSHOT_KEY, eventsBySemester);
        }

        if (weekEventsBySemester) {
          dispatchWeek({
            type: "HYDRATE_WEEK_FROM_STORE",
            payload: { weekEventsBySemester },
          });

          writeSnapshot(WEEK_EVENTS_SNAPSHOT_KEY, weekEventsBySemester);
        }

        // A null result means the adapter deferred the load — no usable auth
        // token — not that the database is empty. Marking this as hydrated
        // would arm the save effects, which would then push the local default
        // state over the real rows and prune everything else away.
        if (!eventsBySemester || !weekEventsBySemester) {
          return;
        }

        setIsOffline(false);
        setLastSyncedAt(new Date().toISOString());
        setDidHydrateFromStorage(true);
      },
      (error: unknown) => {
        if (cancelled) {
          return;
        }

        // A rejected request only means "offline" when the host was actually
        // unreachable. A 4xx/5xx or a missing config must still surface, so it
        // keeps the original throwing behaviour.
        if (!isOfflineError(error)) {
          setPersistenceError(
            toPlannerPersistenceError(
              error,
              "Failed to hydrate planner data from Supabase.",
            ),
          );
          return;
        }

        const cachedEvents =
          readSnapshot<PlannerEventsBySemester>(EVENTS_SNAPSHOT_KEY);
        const cachedWeekEvents = readSnapshot<PlannerWeekEventsBySemester>(
          WEEK_EVENTS_SNAPSHOT_KEY,
        );

        if (cachedEvents) {
          dispatch({
            type: "HYDRATE_FROM_STORE",
            payload: { eventsBySemester: cachedEvents.payload },
          });
        }

        if (cachedWeekEvents) {
          dispatchWeek({
            type: "HYDRATE_WEEK_FROM_STORE",
            payload: { weekEventsBySemester: cachedWeekEvents.payload },
          });
        }

        // Deliberately leave didHydrateFromStorage false: it gates the save
        // effects, whose prune step deletes every row missing from state. A
        // save from cache-hydrated state could therefore erase real data.
        setLastSyncedAt(cachedEvents?.savedAt ?? null);
        setIsOffline(true);
      },
    );

    return () => {
      cancelled = true;
    };
    // Re-runs when friends finish loading and whenever connectivity returns;
    // other friend changes are handled by the RENAME/REMOVE effects below.
  }, [friendsHydrated, reloadToken]);

  // Reconnecting re-runs the load, which replaces cached data with live rows
  // and lifts the read-only state.
  useEffect(() => {
    const handleOnline = () => setReloadToken((token) => token + 1);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Track this device's push subscription so it can be excluded from its own
  // broadcasts. Refreshed whenever the toggle changes subscription state.
  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      void getActiveSubscriptionEndpoint().then((endpoint) => {
        if (!cancelled) {
          ownEndpointRef.current = endpoint;
        }
      });
    };

    sync();
    window.addEventListener("sam:push:changed", sync);

    return () => {
      cancelled = true;
      window.removeEventListener("sam:push:changed", sync);
    };
  }, []);

  useEffect(() => {
    if (!didHydrateFromStorage || !lastMutation) {
      return;
    }

    // Cross-domain listener: friend renames and deletions cascade into the
    // planner store here without tightly coupling the friends and planner
    // domains together.
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

  // Subscribe to Realtime postgres_changes on planner_events and planner_week_events
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    const config = getSupabaseConfig();

    if (!client || !config) {
      return;
    }

    let isCancelled = false;

    const eventsChannel = client
      .channel(`realtime:events:${config.plannerScope}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "planner_events",
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const row = payload.new as SupabaseEventRow;
            if (
              row &&
              row.event_id &&
              (!row.planner_scope || row.planner_scope === config.plannerScope)
            ) {
              const parsed = rowToPlannerEvent(row);
              if (parsed) {
                dispatch({ type: "REMOTE_UPSERT_EVENT", payload: parsed });
              }
            }
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<SupabaseEventRow>;
            if (oldRow && oldRow.event_id) {
              dispatch({
                type: "REMOTE_DELETE_EVENT",
                payload: { eventId: oldRow.event_id },
              });
            }
          }
        },
      );

    const weekEventsChannel = client
      .channel(`realtime:week_events:${config.plannerScope}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "planner_week_events",
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const row = payload.new as SupabaseWeekEventRow;
            if (
              row &&
              row.event_id &&
              (!row.planner_scope || row.planner_scope === config.plannerScope)
            ) {
              const parsed = rowToPlannerWeekEvent(row);
              if (parsed) {
                dispatchWeek({
                  type: "REMOTE_UPSERT_WEEK_EVENT",
                  payload: parsed,
                });
              }
            }
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<SupabaseWeekEventRow>;
            if (oldRow && oldRow.event_id) {
              dispatchWeek({
                type: "REMOTE_DELETE_WEEK_EVENT",
                payload: { eventId: oldRow.event_id },
              });
            }
          }
        },
      );

    void (async () => {
      await ensureRealtimeAuth(client);
      if (isCancelled) return;

      eventsChannel.subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.info("[SAM realtime] Subscribed to planner_events changes.");
        } else if (status === "CHANNEL_ERROR") {
          console.error("[SAM realtime] Channel error on planner_events:", err);
        }
      });

      weekEventsChannel.subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.info("[SAM realtime] Subscribed to planner_week_events changes.");
        } else if (status === "CHANNEL_ERROR") {
          console.error("[SAM realtime] Channel error on planner_week_events:", err);
        }
      });
    })();

    return () => {
      isCancelled = true;
      void client.removeChannel(eventsChannel);
      void client.removeChannel(weekEventsChannel);
    };
  }, []);

  useEffect(() => {
    if (!didHydrateFromStorage || isOffline) {
      return;
    }

    const snapshot = buildEventsBySemesterSnapshot(eventsBySemester);
    writeSnapshot(EVENTS_SNAPSHOT_KEY, snapshot);
  }, [didHydrateFromStorage, isOffline, eventsBySemester]);

  useEffect(() => {
    if (!didHydrateFromStorage || isOffline) {
      return;
    }

    const snapshot = buildWeekEventsBySemesterSnapshot(weekEventsBySemester);
    writeSnapshot(WEEK_EVENTS_SNAPSHOT_KEY, snapshot);
  }, [didHydrateFromStorage, isOffline, weekEventsBySemester]);

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
      isOffline,
      lastSyncedAt,
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
        const sourceSemesterId = findSemesterForEvent(eventsBySemester, eventId);
        if (!sourceSemesterId) return;
        const sourceEvents = eventsBySemester[sourceSemesterId] ?? [];
        const event = sourceEvents.find((item) => item.id === eventId);
        if (!event) return;

        const duration = eventDurationInDays(event);
        const nextStartDate = dateKey;
        const nextEndDate = toDateKey(addDays(toDate(dateKey), duration - 1));

        dispatch({
          type: "MOVE_EVENT_TO_DATE",
          payload: { eventId, dateKey, targetSemesterId: normalizedSemesterId },
        });

        void eventStore.current
          .updateEvent(eventId, {
            startDate: nextStartDate,
            endDate: nextEndDate,
            semesterId: normalizedSemesterId,
          })
          .catch((error) => {
            if (isOfflineError(error)) {
              setIsOffline(true);
              return;
            }
            console.error("Failed to move event to date:", error);
          });
      },
      moveEventToInbox: (eventId) => {
        dispatch({
          type: "MOVE_EVENT_TO_INBOX",
          payload: { eventId },
        });

        void eventStore.current
          .updateEvent(eventId, {
            startDate: null,
            endDate: null,
          })
          .catch((error) => {
            if (isOfflineError(error)) {
              setIsOffline(true);
              return;
            }
            console.error("Failed to move event to inbox:", error);
          });
      },
      createEvent: (input) => {
        const title = input.title.trim();
        const description = input.description?.trim() ?? "";

        if (!title || !plannerEventCategories.includes(input.category)) {
          return;
        }

        const normalizedDates = normalizeDateRange(
          input.startDate,
          input.endDate,
        );

        const event: PlannerEvent = {
          id: `evt-${crypto.randomUUID()}`,
          title,
          description: description || undefined,
          category: input.category,
          startDate: normalizedDates.startDate,
          endDate: normalizedDates.endDate,
          // Sanitize the participant list against the active friends array at
          // the exact moment of creation so we never persist ghost participants
          // that no longer exist in the friends domain.
          participants: filterParticipantsByFriends(
            input.participants,
            friendNames,
          ),
        };

        dispatch({
          type: "CREATE_EVENT",
          payload: {
            semesterId: normalizedSemesterId,
            event,
          },
        });

        void eventStore.current
          .insertEvent(event, normalizedSemesterId)
          .catch((error) => {
            if (isOfflineError(error)) {
              setIsOffline(true);
              return;
            }
            console.error("Failed to insert event:", error);
          });

        const notifItem: NotificationItem = {
          kind: "new-event",
          eventId: event.id,
          title: event.title,
          category: event.category,
          startDate: event.startDate,
          semesterId: normalizedSemesterId,
        };
        void broadcastNotifications([notifItem], ownEndpointRef.current);
      },
      updateEvent: (eventId, input) => {
        const title = input.title.trim();
        const description = input.description?.trim() ?? "";

        if (!title || !plannerEventCategories.includes(input.category)) {
          return;
        }

        const normalizedDates = normalizeDateRange(
          input.startDate,
          input.endDate,
        );

        const participants = filterParticipantsByFriends(
          input.participants,
          friendNames,
        );

        dispatch({
          type: "UPDATE_EVENT",
          payload: {
            eventId,
            title,
            description: description || undefined,
            category: input.category,
            startDate: normalizedDates.startDate,
            endDate: normalizedDates.endDate,
            participants,
          },
        });

        void eventStore.current
          .updateEvent(eventId, {
            title,
            description: description || undefined,
            category: input.category,
            startDate: normalizedDates.startDate,
            endDate: normalizedDates.endDate,
            participants,
            semesterId: normalizedSemesterId,
          })
          .catch((error) => {
            if (isOfflineError(error)) {
              setIsOffline(true);
              return;
            }
            console.error("Failed to update event:", error);
          });
      },
      deleteEvent: (eventId) => {
        dispatch({
          type: "DELETE_EVENT",
          payload: { eventId },
        });

        void eventStore.current.deleteEvent(eventId).catch((error) => {
          if (isOfflineError(error)) {
            setIsOffline(true);
            return;
          }
          console.error("Failed to delete event:", error);
        });
      },
      createWeekEvent: (input) => {
        const title = input.title.trim();
        const description = input.description?.trim() ?? "";

        if (!title || !plannerWeekEventCategories.includes(input.category)) {
          return;
        }

        const weekEvent: PlannerWeekEvent = {
          id: `wevt-${crypto.randomUUID()}`,
          title,
          description: description || undefined,
          category: input.category,
          day: input.day,
          startTime: input.startTime,
          endTime: input.endTime,
          participants: filterParticipantsByFriends(
            input.participants,
            friendNames,
          ),
        };

        dispatchWeek({
          type: "CREATE_WEEK_EVENT",
          payload: {
            semesterId: normalizedSemesterId,
            event: weekEvent,
          },
        });

        void weekEventStore.current
          .insertWeekEvent(weekEvent, normalizedSemesterId)
          .catch((error) => {
            if (isOfflineError(error)) {
              setIsOffline(true);
              return;
            }
            console.error("Failed to insert week event:", error);
          });

        const notifItem: NotificationItem = {
          kind: "new-event",
          eventId: weekEvent.id,
          title: weekEvent.title,
          category: weekEvent.category,
          day: weekEvent.day,
          semesterId: normalizedSemesterId,
        };
        void broadcastNotifications([notifItem], ownEndpointRef.current);
      },
      updateWeekEvent: (eventId, input) => {
        const title = input.title.trim();
        const description = input.description?.trim() ?? "";

        if (!title || !plannerWeekEventCategories.includes(input.category)) {
          return;
        }

        const participants = filterParticipantsByFriends(
          input.participants,
          friendNames,
        );

        dispatchWeek({
          type: "UPDATE_WEEK_EVENT",
          payload: {
            eventId,
            title,
            description: description || undefined,
            category: input.category,
            day: input.day,
            startTime: input.startTime,
            endTime: input.endTime,
            participants,
          },
        });

        void weekEventStore.current
          .updateWeekEvent(eventId, {
            title,
            description: description || undefined,
            category: input.category,
            day: input.day,
            startTime: input.startTime,
            endTime: input.endTime,
            participants,
            semesterId: normalizedSemesterId,
          })
          .catch((error) => {
            if (isOfflineError(error)) {
              setIsOffline(true);
              return;
            }
            console.error("Failed to update week event:", error);
          });
      },
      deleteWeekEvent: (eventId) => {
        dispatchWeek({
          type: "DELETE_WEEK_EVENT",
          payload: { eventId },
        });

        void weekEventStore.current.deleteWeekEvent(eventId).catch((error) => {
          if (isOfflineError(error)) {
            setIsOffline(true);
            return;
          }
          console.error("Failed to delete week event:", error);
        });
      },
      toggleParticipant: (eventId, participantName) => {
        const normalizedName = normalizeFriendName(participantName);

        if (
          !normalizedName ||
          !friendNames.some(
            (friend) =>
              friend.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
          )
        ) {
          return;
        }

        const semesterId = findSemesterForEvent(eventsBySemester, eventId);
        if (!semesterId) return;
        const event = (eventsBySemester[semesterId] ?? []).find(
          (e) => e.id === eventId,
        );
        if (!event) return;

        const hasParticipant = event.participants.includes(normalizedName);
        const nextParticipants = hasParticipant
          ? event.participants.filter((name) => name !== normalizedName)
          : [...event.participants, normalizedName];

        dispatch({
          type: "TOGGLE_PARTICIPANT",
          payload: { eventId, participantName: normalizedName },
        });

        void eventStore.current
          .updateEvent(eventId, { participants: nextParticipants })
          .catch((error) => {
            if (isOfflineError(error)) {
              setIsOffline(true);
              return;
            }
            console.error("Failed to toggle participant:", error);
          });

        if (!hasParticipant) {
          const notifItem: NotificationItem = {
            kind: "new-participant",
            eventId: event.id,
            title: event.title,
            category: event.category,
            startDate: event.startDate,
            semesterId,
            participants: [normalizedName],
          };
          void broadcastNotifications([notifItem], ownEndpointRef.current);
        }
      },
    };
  }, [
    activeSemester,
    events,
    eventsBySemester,
    friendNames,
    inboxEvents,
    isOffline,
    lastSyncedAt,
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
/**
 * Returns the active planner state context for consumer components.
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
