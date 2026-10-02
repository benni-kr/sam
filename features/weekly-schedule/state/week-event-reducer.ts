/**
 * Weekly Event Reducer
 *
 * This reducer owns the immutable update rules for semester-scoped weekly
 * events, including hydration, creation, update, and deletion.
 */

import {
  plannerSemesterIds,
  type PlannerSemesterId,
} from "@/features/planner/lib/planner";
import type { PlannerWeekEvent } from "@/features/weekly-schedule/lib/week-types";
import { type PlannerWeekEventsBySemester } from "@/features/weekly-schedule/lib/week-persistence";

/**
 * Actions that can mutate the weekly-event state tree.
 */
export type PlannerWeekAction =
  | {
      /** Hydrates the weekly semester map from persistence. */
      type: "HYDRATE_WEEK_FROM_STORE";
      payload: {
        /** Semester-keyed weekly events loaded from Supabase. */
        weekEventsBySemester: PlannerWeekEventsBySemester | null;
      };
    }
  | {
      /** Creates a new repeating weekly event in one semester. */
      type: "CREATE_WEEK_EVENT";
      payload: {
        /** Semester that owns the new weekly event. */
        semesterId: PlannerSemesterId;
        /** Fully formed weekly event object ready for persistence. */
        event: PlannerWeekEvent;
      };
    }
  | {
      /** Updates an existing weekly event in place. */
      type: "UPDATE_WEEK_EVENT";
      payload: {
        /** Event identifier from the weekly semester store. */
        eventId: string;
        /** Updated display title. */
        title: string;
        /** Updated optional description shown in previews and details. */
        description?: string;
        /** Updated weekly category used for theming and filtering. */
        category: PlannerWeekEvent["category"];
        /** Updated weekday that determines the grid column. */
        day: PlannerWeekEvent["day"];
        /** Updated start time in HH:MM format. */
        startTime: string;
        /** Updated end time in HH:MM format. */
        endTime: string;
        /** Updated participant list, normalized against the friends domain. */
        participants: string[];
      };
    }
  | {
      /** Deletes a weekly event from the current semester store. */
      type: "DELETE_WEEK_EVENT";
      payload: {
        /** Event identifier from the weekly semester store. */
        eventId: string;
      };
    }
  | {
      /** Handles remote upsert (insert or update) from Realtime broadcast. */
      type: "REMOTE_UPSERT_WEEK_EVENT";
      payload: {
        semesterId: PlannerSemesterId;
        event: PlannerWeekEvent;
      };
    }
  | {
      /** Handles remote deletion from Realtime broadcast. */
      type: "REMOTE_DELETE_WEEK_EVENT";
      payload: {
        eventId: string;
      };
    }
  | {
      /** Renames a participant across all weekly events. */
      type: "RENAME_PARTICIPANT_IN_ALL_WEEK_EVENTS";
      payload: {
        currentName: string;
        nextName: string;
      };
    }
  | {
      /** Removes a participant from all weekly events. */
      type: "REMOVE_PARTICIPANT_FROM_ALL_WEEK_EVENTS";
      payload: {
        participantName: string;
      };
    };

/**
 * Locates the semester that owns a weekly event.
 *
 * `PlannerWeekEvent` objects do not store a `semesterId` internally, so the
 * reducer must search the semester-keyed state tree to find the bucket that
 * contains a given event before it can update or delete it.
 */
function findSemesterForWeekEvent(
  weekEventsBySemester: PlannerWeekEventsBySemester,
  eventId: string,
): PlannerSemesterId | null {
  for (const semesterId of Object.keys(weekEventsBySemester)) {
    const semesterEvents = weekEventsBySemester[semesterId] ?? [];

    if (semesterEvents.some((event) => event.id === eventId)) {
      return semesterId;
    }
  }

  return null;
}

/**
 * Applies weekly-event mutations to the semester-scoped state tree.
 */
export function plannerWeekStateReducer(
  state: PlannerWeekEventsBySemester,
  action: PlannerWeekAction,
): PlannerWeekEventsBySemester {
  switch (action.type) {
    case "HYDRATE_WEEK_FROM_STORE": {
      const { weekEventsBySemester } = action.payload;

      if (!weekEventsBySemester) {
        return state;
      }

      const nextState: PlannerWeekEventsBySemester = { ...state };
      const allSemesterKeys = Array.from(
        new Set([...plannerSemesterIds, ...Object.keys(weekEventsBySemester)]),
      );

      for (const semesterId of allSemesterKeys) {
        const semesterEvents = weekEventsBySemester[semesterId] ?? [];
        nextState[semesterId] = semesterEvents.map((event) => ({
          ...event,
          // Deep-clone participants to preserve React state immutability and
          // avoid reference bugs leaking from the persistence layer.
          participants: [...event.participants],
        }));
      }

      return nextState;
    }

    case "CREATE_WEEK_EVENT": {
      const { semesterId, event } = action.payload;
      const semesterEvents = state[semesterId] ?? [];

      return {
        ...state,
        [semesterId]: [...semesterEvents, event],
      };
    }

    case "UPDATE_WEEK_EVENT": {
      const semesterId = findSemesterForWeekEvent(
        state,
        action.payload.eventId,
      );

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
            day: action.payload.day,
            startTime: action.payload.startTime,
            endTime: action.payload.endTime,
            participants: action.payload.participants,
          };
        }),
      };
    }

    case "DELETE_WEEK_EVENT": {
      const semesterId = findSemesterForWeekEvent(
        state,
        action.payload.eventId,
      );

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

    case "REMOTE_UPSERT_WEEK_EVENT": {
      const { semesterId, event } = action.payload;
      const existingSemesterId = findSemesterForWeekEvent(state, event.id);

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

    case "REMOTE_DELETE_WEEK_EVENT": {
      const semesterId = findSemesterForWeekEvent(
        state,
        action.payload.eventId,
      );

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

    case "REMOVE_PARTICIPANT_FROM_ALL_WEEK_EVENTS": {
      const target = action.payload.participantName.toLocaleLowerCase();

      return Object.keys(state).reduce((nextState, semesterId) => {
        const semesterEvents = state[semesterId] ?? [];

        nextState[semesterId] = semesterEvents.map((event) => ({
          ...event,
          participants: event.participants.filter(
            (participant) => participant.toLocaleLowerCase() !== target,
          ),
        }));

        return nextState;
      }, {} as PlannerWeekEventsBySemester);
    }

    case "RENAME_PARTICIPANT_IN_ALL_WEEK_EVENTS": {
      const currentName = action.payload.currentName.toLocaleLowerCase();
      const nextName = action.payload.nextName;

      return Object.keys(state).reduce((nextState, semesterId) => {
        const semesterEvents = state[semesterId] ?? [];

        nextState[semesterId] = semesterEvents.map((event) => {
          const uniqueByLower = new Map<string, string>();
          for (const p of event.participants) {
            const mapped = p.toLocaleLowerCase() === currentName ? nextName : p;
            const trimmed = mapped.trim();
            if (trimmed && !uniqueByLower.has(trimmed.toLocaleLowerCase())) {
              uniqueByLower.set(trimmed.toLocaleLowerCase(), trimmed);
            }
          }

          return {
            ...event,
            participants: Array.from(uniqueByLower.values()),
          };
        });

        return nextState;
      }, {} as PlannerWeekEventsBySemester);
    }

    default:
      return state;
  }
}
