"use client";

/**
 * Planner State
 *
 * This module coordinates planner hydration, local reducer state, persistence
 * writes, and derived selectors for both calendar and weekly schedule views.
 * Calendar events are maintained in a flat collection where semester inclusion
 * is dynamically derived based on date range overlap.
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
  rowToEvent,
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
  clampToMinDate,
  defaultPlannerSemesterId,
  eventOverlapsSemester,
  getAvailableSemesters,
  getPlannerSemester,
  getSemesterIdForDate,
  normalizeDateRange,
  plannerEventCategories,
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

type EventsBySemester = Record<string, PlannerEvent[]>;

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
  availableSemesters: PlannerSemester[];
  months: PlannerMonth[];
  allEvents: PlannerEvent[];
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

export type PlannerAction =
  | {
      /** Hydrates the calendar event state from persistence. */
      type: "HYDRATE_FROM_STORE";
      payload: {
        events: PlannerEvent[] | PlannerEventsBySemester | null;
      };
    }
  | {
      /** Moves a calendar event to a dated calendar slot. */
      type: "MOVE_EVENT_TO_DATE";
      payload: {
        eventId: string;
        startDate?: string;
        endDate?: string;
        dateKey?: string;
        targetSemesterId?: string;
      };
    }
  | {
      /** Returns a dated calendar event back to the inbox. */
      type: "MOVE_EVENT_TO_INBOX";
      payload: {
        eventId: string;
      };
    }
  | {
      /** Creates a new calendar event. */
      type: "CREATE_EVENT";
      payload: {
        event: PlannerEvent;
        semesterId?: string;
      };
    }
  | {
      /** Updates an existing calendar event in place. */
      type: "UPDATE_EVENT";
      payload: {
        eventId: string;
        title: string;
        description?: string;
        category: PlannerEventCategory;
        startDate: string | null;
        endDate: string | null;
        participants: string[];
      };
    }
  | {
      /** Deletes an event from the store. */
      type: "DELETE_EVENT";
      payload: {
        eventId: string;
      };
    }
  | {
      /** Toggles a participant name on a calendar event. */
      type: "TOGGLE_PARTICIPANT";
      payload: {
        eventId: string;
        participantName: string;
      };
    }
  | {
      /** Removes one participant from every calendar event. */
      type: "REMOVE_PARTICIPANT_FROM_ALL_EVENTS";
      payload: {
        participantName: string;
      };
    }
  | {
      /** Renames one participant across the entire calendar store. */
      type: "RENAME_PARTICIPANT_IN_ALL_EVENTS";
      payload: {
        currentName: string;
        nextName: string;
      };
    }
  | {
      /** Handles remote upsert (insert or update) from Realtime broadcast. */
      type: "REMOTE_UPSERT_EVENT";
      payload: {
        event: PlannerEvent;
        semesterId?: string;
      };
    }
  | {
      /** Handles remote deletion from Realtime broadcast. */
      type: "REMOTE_DELETE_EVENT";
      payload: {
        eventId: string;
      };
    };

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

function eventDurationInDays(event: PlannerEvent) {
  if (!event.startDate || !event.endDate) {
    return 1;
  }

  const start = toDate(event.startDate);
  const end = toDate(event.endDate);
  const durationMs = end.getTime() - start.getTime();

  return Math.max(1, Math.floor(durationMs / (1000 * 60 * 60 * 24)) + 1);
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

function buildWeekEventsBySemesterSnapshot(
  weekEventsBySemester: PlannerWeekEventsBySemester,
): PlannerWeekEventsBySemester {
  const snapshot: PlannerWeekEventsBySemester = {};

  for (const semesterId of Object.keys(weekEventsBySemester)) {
    const semesterEvents = weekEventsBySemester[semesterId] ?? [];
    snapshot[semesterId] = semesterEvents.map((event) => ({
      ...event,
      participants: [...event.participants],
    }));
  }

  return snapshot;
}

function toPlannerPersistenceError(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

/**
 * Extracts and sorts all undated events across semesters for the inbox view.
 * Accepts either flat PlannerEvent[] or legacy Record<string, PlannerEvent[]>.
 */
export function getInboxEventsFromState(
  events: PlannerEvent[] | EventsBySemester,
): PlannerEvent[] {
  const flatEvents: PlannerEvent[] = Array.isArray(events)
    ? events
    : Object.values(events).flat();

  return flatEvents
    .filter((event) => !event.startDate)
    .sort((left, right) => left.title.localeCompare(right.title));
}

/**
 * Normalizes input events that might be in flat array or legacy dict shape into a flat array.
 */
function normalizeEventsPayload(
  payload: PlannerEvent[] | PlannerEventsBySemester | null | undefined,
): PlannerEvent[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return Object.values(payload)
    .flat()
    .filter((e): e is PlannerEvent => Boolean(e));
}

/**
 * Applies planner calendar mutations to the event state tree.
 * Supports both flat PlannerEvent[] and legacy EventsBySemester for testing compatibility.
 */
export function plannerStateReducer(
  state: PlannerEvent[],
  action: PlannerAction,
): PlannerEvent[];
export function plannerStateReducer(
  state: EventsBySemester,
  action: PlannerAction,
): EventsBySemester;
export function plannerStateReducer(
  state: PlannerEvent[] | EventsBySemester,
  action: PlannerAction,
): PlannerEvent[] | EventsBySemester {
  // Support legacy dictionary state if passed by older unit tests
  const isLegacyDict = !Array.isArray(state);

  if (isLegacyDict) {
    const dictState = state as EventsBySemester;

    switch (action.type) {
      case "HYDRATE_FROM_STORE": {
        const events = normalizeEventsPayload(action.payload.events);
        const nextState: EventsBySemester = {};
        for (const ev of events) {
          const sId = ev.startDate ? getSemesterIdForDate(ev.startDate) : defaultPlannerSemesterId;
          if (!nextState[sId]) nextState[sId] = [];
          nextState[sId].push(ev);
        }
        return nextState;
      }
      case "MOVE_EVENT_TO_DATE": {
        const { eventId, targetSemesterId } = action.payload;
        let foundEvent: PlannerEvent | undefined;
        let sourceSemesterId: string | undefined;

        for (const sId of Object.keys(dictState)) {
          const ev = dictState[sId]?.find((e) => e.id === eventId);
          if (ev) {
            foundEvent = ev;
            sourceSemesterId = sId;
            break;
          }
        }

        if (!foundEvent || !sourceSemesterId) return dictState;

        const dateKey = action.payload.dateKey ?? action.payload.startDate!;
        const duration = eventDurationInDays(foundEvent);
        const nextStartDate = clampToMinDate(dateKey)!;
        const nextEndDate =
          action.payload.endDate ??
          toDateKey(addDays(toDate(nextStartDate), duration - 1));

        const updatedEvent: PlannerEvent = {
          ...foundEvent,
          startDate: nextStartDate,
          endDate: nextEndDate,
        };

        const targetId = targetSemesterId ?? getSemesterIdForDate(nextStartDate);
        const nextState: EventsBySemester = { ...dictState };

        if (sourceSemesterId !== targetId) {
          nextState[sourceSemesterId] = (nextState[sourceSemesterId] ?? []).filter(
            (e) => e.id !== eventId,
          );
          nextState[targetId] = [...(nextState[targetId] ?? []), updatedEvent];
        } else {
          nextState[targetId] = (nextState[targetId] ?? []).map((e) =>
            e.id === eventId ? updatedEvent : e,
          );
        }
        return nextState;
      }
      case "MOVE_EVENT_TO_INBOX": {
        const nextState: EventsBySemester = {};
        for (const sId of Object.keys(dictState)) {
          nextState[sId] = (dictState[sId] ?? []).map((e) =>
            e.id === action.payload.eventId
              ? { ...e, startDate: null, endDate: null }
              : e,
          );
        }
        return nextState;
      }
      case "CREATE_EVENT": {
        const sId = action.payload.semesterId ?? (action.payload.event.startDate ? getSemesterIdForDate(action.payload.event.startDate) : defaultPlannerSemesterId);
        return {
          ...dictState,
          [sId]: [...(dictState[sId] ?? []), action.payload.event],
        };
      }
      case "UPDATE_EVENT": {
        const nextState: EventsBySemester = {};
        for (const sId of Object.keys(dictState)) {
          nextState[sId] = (dictState[sId] ?? []).map((e) =>
            e.id === action.payload.eventId
              ? {
                  ...e,
                  title: action.payload.title,
                  description: action.payload.description,
                  category: action.payload.category,
                  startDate: action.payload.startDate,
                  endDate: action.payload.endDate,
                  participants: action.payload.participants,
                }
              : e,
          );
        }
        return nextState;
      }
      case "DELETE_EVENT": {
        const nextState: EventsBySemester = {};
        for (const sId of Object.keys(dictState)) {
          nextState[sId] = (dictState[sId] ?? []).filter(
            (e) => e.id !== action.payload.eventId,
          );
        }
        return nextState;
      }
      case "TOGGLE_PARTICIPANT": {
        const { eventId, participantName } = action.payload;
        const nextState: EventsBySemester = {};
        for (const sId of Object.keys(dictState)) {
          nextState[sId] = (dictState[sId] ?? []).map((e) => {
            if (e.id !== eventId) return e;
            const hasParticipant = e.participants.includes(participantName);
            return {
              ...e,
              participants: hasParticipant
                ? e.participants.filter((p) => p !== participantName)
                : [...e.participants, participantName],
            };
          });
        }
        return nextState;
      }
      case "REMOVE_PARTICIPANT_FROM_ALL_EVENTS": {
        const target = action.payload.participantName.toLocaleLowerCase();
        const nextState: EventsBySemester = {};
        for (const sId of Object.keys(dictState)) {
          nextState[sId] = (dictState[sId] ?? []).map((e) => ({
            ...e,
            participants: e.participants.filter(
              (p) => p.toLocaleLowerCase() !== target,
            ),
          }));
        }
        return nextState;
      }
      case "RENAME_PARTICIPANT_IN_ALL_EVENTS": {
        const currentName = action.payload.currentName.toLocaleLowerCase();
        const nextName = action.payload.nextName;
        const nextState: EventsBySemester = {};
        for (const sId of Object.keys(dictState)) {
          nextState[sId] = (dictState[sId] ?? []).map((e) => ({
            ...e,
            participants: dedupeParticipantNames(
              e.participants.map((p) =>
                p.toLocaleLowerCase() === currentName ? nextName : p,
              ),
            ),
          }));
        }
        return nextState;
      }
      case "REMOTE_UPSERT_EVENT": {
        const event = action.payload.event;
        const sId = action.payload.semesterId ?? (event.startDate ? getSemesterIdForDate(event.startDate) : defaultPlannerSemesterId);
        const nextState: EventsBySemester = {};
        for (const key of Object.keys(dictState)) {
          nextState[key] = (dictState[key] ?? []).filter((e) => e.id !== event.id);
        }
        nextState[sId] = [...(nextState[sId] ?? []), event];
        return nextState;
      }
      case "REMOTE_DELETE_EVENT": {
        const nextState: EventsBySemester = {};
        for (const sId of Object.keys(dictState)) {
          nextState[sId] = (dictState[sId] ?? []).filter(
            (e) => e.id !== action.payload.eventId,
          );
        }
        return nextState;
      }
      default:
        return dictState;
    }
  }

  // Canonical Flat State Implementation
  const flatState = state as PlannerEvent[];

  switch (action.type) {
    case "HYDRATE_FROM_STORE": {
      const events = normalizeEventsPayload(action.payload.events);
      return events.map((event) => ({
        ...event,
        participants: [...event.participants],
      }));
    }

    case "MOVE_EVENT_TO_DATE": {
      const { eventId } = action.payload;
      const event = flatState.find((item) => item.id === eventId);
      if (!event) return flatState;

      const dateKey = action.payload.dateKey ?? action.payload.startDate!;
      const clampedDateKey = clampToMinDate(dateKey)!;
      const duration = eventDurationInDays(event);
      const nextStartDate = clampedDateKey;
      const nextEndDate =
        action.payload.endDate ??
        toDateKey(addDays(toDate(clampedDateKey), duration - 1));

      return flatState.map((item) => {
        if (item.id !== eventId) return item;
        return {
          ...item,
          startDate: nextStartDate,
          endDate: nextEndDate,
        };
      });
    }

    case "MOVE_EVENT_TO_INBOX": {
      const { eventId } = action.payload;
      return flatState.map((event) => {
        if (event.id !== eventId) return event;
        return {
          ...event,
          startDate: null,
          endDate: null,
        };
      });
    }

    case "CREATE_EVENT": {
      return [...flatState, action.payload.event];
    }

    case "UPDATE_EVENT": {
      return flatState.map((event) => {
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
      });
    }

    case "DELETE_EVENT": {
      return flatState.filter((event) => event.id !== action.payload.eventId);
    }

    case "TOGGLE_PARTICIPANT": {
      const { eventId, participantName } = action.payload;
      const trimmedName = participantName.trim();

      if (!trimmedName) {
        return flatState;
      }

      return flatState.map((event) => {
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
      });
    }

    case "REMOVE_PARTICIPANT_FROM_ALL_EVENTS": {
      const target = action.payload.participantName.toLocaleLowerCase();

      return flatState.map((event) => ({
        ...event,
        participants: event.participants.filter(
          (participant) => participant.toLocaleLowerCase() !== target,
        ),
      }));
    }

    case "RENAME_PARTICIPANT_IN_ALL_EVENTS": {
      const currentName = action.payload.currentName.toLocaleLowerCase();
      const nextName = action.payload.nextName;

      return flatState.map((event) => ({
        ...event,
        participants: dedupeParticipantNames(
          event.participants.map((participant) =>
            participant.toLocaleLowerCase() === currentName ? nextName : participant,
          ),
        ),
      }));
    }

    case "REMOTE_UPSERT_EVENT": {
      const { event } = action.payload;
      const exists = flatState.some((item) => item.id === event.id);

      return exists
        ? flatState.map((item) => (item.id === event.id ? event : item))
        : [...flatState, event];
    }

    case "REMOTE_DELETE_EVENT": {
      return flatState.filter((event) => event.id !== action.payload.eventId);
    }

    default:
      return flatState;
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
      events,
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
  const [allEvents, dispatch] = useReducer<PlannerEvent[], [PlannerAction]>(
    plannerStateReducer,
    [],
  );
  const [weekEventsBySemester, dispatchWeek] = useReducer(
    plannerWeekStateReducer,
    undefined,
    () => ({ [defaultPlannerSemesterId]: [] }),
  );
  const [didHydrateFromStorage, setDidHydrateFromStorage] = useState(false);
  const eventStore = useRef(resolvePlannerEventStore());
  const weekEventStore = useRef(resolveWeekEventStore());
  const allEventsRef = useRef(allEvents);
  const weekEventsBySemesterRef = useRef(weekEventsBySemester);

  useEffect(() => {
    allEventsRef.current = allEvents;
    weekEventsBySemesterRef.current = weekEventsBySemester;
  }, [allEvents, weekEventsBySemester]);

  const [persistenceError, setPersistenceError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
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

    void Promise.all([
      eventStore.current.loadEvents
        ? eventStore.current.loadEvents()
        : eventStore.current.loadEventsBySemester(),
      weekEventStore.current.loadWeekEventsBySemester(),
    ]).then(
      ([rawLoadedEvents, loadedWeekEvents]) => {
        if (cancelled) {
          return;
        }

        if (rawLoadedEvents) {
          const events = normalizeEventsPayload(rawLoadedEvents);

          dispatch({
            type: "HYDRATE_FROM_STORE",
            payload: { events },
          });

          writeSnapshot(EVENTS_SNAPSHOT_KEY, events);
        }

        if (loadedWeekEvents) {
          dispatchWeek({
            type: "HYDRATE_WEEK_FROM_STORE",
            payload: { weekEventsBySemester: loadedWeekEvents },
          });

          writeSnapshot(WEEK_EVENTS_SNAPSHOT_KEY, loadedWeekEvents);
        }

        if (!rawLoadedEvents || !loadedWeekEvents) {
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

        if (!isOfflineError(error)) {
          setPersistenceError(
            toPlannerPersistenceError(
              error,
              "Failed to hydrate planner data from Supabase.",
            ),
          );
          return;
        }

        const cachedEvents = readSnapshot<PlannerEvent[] | PlannerEventsBySemester>(
          EVENTS_SNAPSHOT_KEY,
        );
        const cachedWeekEvents = readSnapshot<PlannerWeekEventsBySemester>(
          WEEK_EVENTS_SNAPSHOT_KEY,
        );

        if (cachedEvents) {
          const events = normalizeEventsPayload(cachedEvents.payload);

          dispatch({
            type: "HYDRATE_FROM_STORE",
            payload: { events },
          });
        }

        if (cachedWeekEvents) {
          dispatchWeek({
            type: "HYDRATE_WEEK_FROM_STORE",
            payload: { weekEventsBySemester: cachedWeekEvents.payload },
          });
        }

        setLastSyncedAt(cachedEvents?.savedAt ?? null);
        setIsOffline(true);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [friendsHydrated, reloadToken]);

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

    if (lastMutation.type === "rename") {
      const { currentName, nextName } = lastMutation;
      const targetLower = currentName.toLocaleLowerCase();

      dispatch({
        type: "RENAME_PARTICIPANT_IN_ALL_EVENTS",
        payload: { currentName, nextName },
      });

      dispatchWeek({
        type: "RENAME_PARTICIPANT_IN_ALL_WEEK_EVENTS",
        payload: { currentName, nextName },
      });

      for (const event of allEventsRef.current) {
        if (
          event.participants.some(
            (p) => p.toLocaleLowerCase() === targetLower,
          )
        ) {
          const nextParticipants = dedupeParticipantNames(
            event.participants.map((p) =>
              p.toLocaleLowerCase() === targetLower ? nextName : p,
            ),
          );
          void eventStore.current
            .updateEvent(event.id, {
              participants: nextParticipants,
            })
            .catch((err) =>
              console.error("Failed to cascade rename to event:", err),
            );
        }
      }

      for (const semesterId of Object.keys(weekEventsBySemesterRef.current)) {
        for (const weekEvent of weekEventsBySemesterRef.current[semesterId] ?? []) {
          if (
            weekEvent.participants.some(
              (p) => p.toLocaleLowerCase() === targetLower,
            )
          ) {
            const nextParticipants = dedupeParticipantNames(
              weekEvent.participants.map((p) =>
                p.toLocaleLowerCase() === targetLower ? nextName : p,
              ),
            );
            void weekEventStore.current
              .updateWeekEvent(weekEvent.id, {
                participants: nextParticipants,
                semesterId,
              })
              .catch((err) =>
                console.error("Failed to cascade rename to week event:", err),
              );
          }
        }
      }
    }

    if (lastMutation.type === "remove") {
      const { name } = lastMutation;
      const targetLower = name.toLocaleLowerCase();

      dispatch({
        type: "REMOVE_PARTICIPANT_FROM_ALL_EVENTS",
        payload: { participantName: name },
      });

      dispatchWeek({
        type: "REMOVE_PARTICIPANT_FROM_ALL_WEEK_EVENTS",
        payload: { participantName: name },
      });

      for (const event of allEventsRef.current) {
        if (
          event.participants.some(
            (p) => p.toLocaleLowerCase() === targetLower,
          )
        ) {
          const nextParticipants = event.participants.filter(
            (p) => p.toLocaleLowerCase() !== targetLower,
          );
          void eventStore.current
            .updateEvent(event.id, {
              participants: nextParticipants,
            })
            .catch((err) =>
              console.error("Failed to cascade remove to event:", err),
            );
        }
      }

      for (const semesterId of Object.keys(weekEventsBySemesterRef.current)) {
        for (const weekEvent of weekEventsBySemesterRef.current[semesterId] ?? []) {
          if (
            weekEvent.participants.some(
              (p) => p.toLocaleLowerCase() === targetLower,
            )
          ) {
            const nextParticipants = weekEvent.participants.filter(
              (p) => p.toLocaleLowerCase() !== targetLower,
            );
            void weekEventStore.current
              .updateWeekEvent(weekEvent.id, {
                participants: nextParticipants,
                semesterId,
              })
              .catch((err) =>
                console.error("Failed to cascade remove to week event:", err),
              );
          }
        }
      }
    }
  }, [didHydrateFromStorage, lastMutation]);

  // Subscribe to Realtime postgres_changes
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
              const parsedEvent = rowToEvent(row);
              if (parsedEvent) {
                dispatch({
                  type: "REMOTE_UPSERT_EVENT",
                  payload: { event: parsedEvent },
                });
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

    writeSnapshot(EVENTS_SNAPSHOT_KEY, allEvents);
  }, [didHydrateFromStorage, isOffline, allEvents]);

  useEffect(() => {
    if (!didHydrateFromStorage || isOffline) {
      return;
    }

    const snapshot = buildWeekEventsBySemesterSnapshot(weekEventsBySemester);
    writeSnapshot(WEEK_EVENTS_SNAPSHOT_KEY, snapshot);
  }, [didHydrateFromStorage, isOffline, weekEventsBySemester]);

  const normalizedSemesterId = activeSemesterId || defaultPlannerSemesterId;
  const activeSemester = useMemo(
    () => getPlannerSemester(normalizedSemesterId),
    [normalizedSemesterId],
  );

  const availableSemesters = useMemo(
    () => getAvailableSemesters(allEvents),
    [allEvents],
  );

  const events = useMemo(
    () => allEvents.filter((event) => eventOverlapsSemester(event, activeSemester)),
    [allEvents, activeSemester],
  );

  const weekEvents =
    weekEventsBySemester[normalizedSemesterId] ?? activeSemester.weekEvents;

  const inboxEvents = useMemo(
    () => getInboxEventsFromState(allEvents),
    [allEvents],
  );

  const value = useMemo<PlannerStateContextValue>(() => {
    const categorySummaries = buildCategorySummaries(events);
    const chronologicalEvents = sortChronological(events);

    return {
      isOffline,
      lastSyncedAt,
      activeSemesterId: normalizedSemesterId,
      activeSemester,
      availableSemesters,
      months: activeSemester.months,
      allEvents,
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
        const event = allEvents.find((item) => item.id === eventId);
        if (!event) return;

        const clampedDateKey = clampToMinDate(dateKey)!;
        const duration = eventDurationInDays(event);
        const nextStartDate = clampedDateKey;
        const nextEndDate = toDateKey(addDays(toDate(clampedDateKey), duration - 1));

        dispatch({
          type: "MOVE_EVENT_TO_DATE",
          payload: { eventId, startDate: nextStartDate, endDate: nextEndDate },
        });

        void eventStore.current
          .updateEvent(eventId, {
            startDate: nextStartDate,
            endDate: nextEndDate,
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
          participants: dedupeParticipantNames(input.participants),
        };

        dispatch({
          type: "CREATE_EVENT",
          payload: { event },
        });

        void eventStore.current
          .insertEvent(event)
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
          semesterId: event.startDate ? getSemesterIdForDate(event.startDate) : undefined,
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

        const participants = dedupeParticipantNames(input.participants);

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
          participants: dedupeParticipantNames(input.participants),
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

        const participants = dedupeParticipantNames(input.participants);

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

        const event = allEvents.find((e) => e.id === eventId);
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
            semesterId: event.startDate ? getSemesterIdForDate(event.startDate) : undefined,
            participants: [normalizedName],
          };
          void broadcastNotifications([notifItem], ownEndpointRef.current);
        }
      },
    };
  }, [
    activeSemester,
    allEvents,
    availableSemesters,
    events,
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
export function usePlannerState() {
  const context = useContext(PlannerStateContext);

  if (!context) {
    throw new Error(
      "usePlannerState must be used inside PlannerStateProvider.",
    );
  }

  return context;
}
