import {
  plannerSemesterIds,
  type PlannerSemesterId,
  type PlannerWeekEvent,
} from "../lib/planner";
import { type PlannerWeekEventsBySemester } from "../lib/planner-persistence";

export type PlannerWeekAction =
  | {
      type: "HYDRATE_WEEK_FROM_STORE";
      payload: {
        weekEventsBySemester: PlannerWeekEventsBySemester | null;
      };
    }
  | {
      type: "CREATE_WEEK_EVENT";
      payload: {
        semesterId: PlannerSemesterId;
        event: PlannerWeekEvent;
      };
    }
  | {
      type: "UPDATE_WEEK_EVENT";
      payload: {
        eventId: string;
        title: string;
        category: PlannerWeekEvent["category"];
        day: PlannerWeekEvent["day"];
        startTime: string;
        endTime: string;
        participants: string[];
      };
    }
  | {
      type: "DELETE_WEEK_EVENT";
      payload: {
        eventId: string;
      };
    };

function findSemesterForWeekEvent(
  weekEventsBySemester: PlannerWeekEventsBySemester,
  eventId: string,
): PlannerSemesterId | null {
  for (const semesterId of plannerSemesterIds) {
    const semesterEvents = weekEventsBySemester[semesterId] ?? [];

    if (semesterEvents.some((event) => event.id === eventId)) {
      return semesterId;
    }
  }

  return null;
}

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

      for (const semesterId of plannerSemesterIds) {
        const semesterEvents = weekEventsBySemester[semesterId] ?? [];
        nextState[semesterId] = semesterEvents.map((event) => ({
          ...event,
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

    default:
      return state;
  }
}
