import { describe, expect, it } from "vitest";

import {
  plannerWeekStateReducer,
  type PlannerWeekAction,
} from "./week-event-reducer";
import { type PlannerWeekEventsBySemester } from "../../planner/lib/planner-persistence";
import { plannerSemesterIds } from "../../planner/lib/planner";
import type { PlannerWeekEvent } from "@/features/weekly-schedule/lib/week-types";

function makeEvent(
  overrides: Partial<PlannerWeekEvent> = {},
): PlannerWeekEvent {
  return {
    id: "week-test-1",
    title: "Algorithms lecture",
    category: "University",
    day: "Mon",
    startTime: "08:15",
    endTime: "09:45",
    participants: ["Maya"],
    ...overrides,
  };
}

function cloneState(
  spring: PlannerWeekEvent[] = [],
  fall: PlannerWeekEvent[] = [],
): PlannerWeekEventsBySemester {
  return {
    [plannerSemesterIds[0]]: spring.map((e) => ({
      ...e,
      participants: [...e.participants],
    })),
    [plannerSemesterIds[1]]: fall.map((e) => ({
      ...e,
      participants: [...e.participants],
    })),
  };
}

describe("plannerWeekStateReducer", () => {
  describe("HYDRATE_WEEK_FROM_STORE", () => {
    it("returns unchanged state when payload is null", () => {
      const state = cloneState([makeEvent()]);
      const action: PlannerWeekAction = {
        type: "HYDRATE_WEEK_FROM_STORE",
        payload: { weekEventsBySemester: null },
      };

      const nextState = plannerWeekStateReducer(state, action);

      expect(nextState).toBe(state);
    });

    it("replaces state with hydrated data, deep-cloning participants", () => {
      const initial = cloneState();
      const hydrated = cloneState([
        makeEvent({ id: "week-h-1", title: "Hydrated" }),
      ]);

      const action: PlannerWeekAction = {
        type: "HYDRATE_WEEK_FROM_STORE",
        payload: { weekEventsBySemester: hydrated },
      };

      const nextState = plannerWeekStateReducer(initial, action);

      expect(nextState[plannerSemesterIds[0]]).toHaveLength(1);
      expect(nextState[plannerSemesterIds[0]]![0].title).toBe("Hydrated");

      const originalParticipants =
        hydrated[plannerSemesterIds[0]]![0].participants;
      const clonedParticipants =
        nextState[plannerSemesterIds[0]]![0].participants;
      expect(clonedParticipants).toEqual(originalParticipants);
      expect(clonedParticipants).not.toBe(originalParticipants);
    });

    it("populates all semesters from the hydrated store", () => {
      const initial = cloneState();
      const springEvent = makeEvent({
        id: "spring-1",
        title: "Spring lecture",
      });
      const fallEvent = makeEvent({
        id: "fall-1",
        title: "Fall lecture",
        day: "Wed",
      });
      const hydrated = cloneState([springEvent], [fallEvent]);

      const action: PlannerWeekAction = {
        type: "HYDRATE_WEEK_FROM_STORE",
        payload: { weekEventsBySemester: hydrated },
      };

      const nextState = plannerWeekStateReducer(initial, action);

      expect(nextState[plannerSemesterIds[0]]).toHaveLength(1);
      expect(nextState[plannerSemesterIds[1]]).toHaveLength(1);
      expect(nextState[plannerSemesterIds[1]]![0].id).toBe("fall-1");
    });
  });

  describe("CREATE_WEEK_EVENT", () => {
    it("appends a new event to the target semester", () => {
      const state = cloneState([makeEvent()]);
      const newEvent = makeEvent({ id: "week-new", title: "New lecture" });
      const action: PlannerWeekAction = {
        type: "CREATE_WEEK_EVENT",
        payload: { semesterId: plannerSemesterIds[0], event: newEvent },
      };

      const nextState = plannerWeekStateReducer(state, action);

      expect(nextState[plannerSemesterIds[0]]).toHaveLength(2);
      expect(nextState[plannerSemesterIds[0]]!.at(-1)).toMatchObject({
        id: "week-new",
        title: "New lecture",
      });
    });

    it("does not mutate the other semester", () => {
      const fallEvent = makeEvent({ id: "fall-1" });
      const state = cloneState([], [fallEvent]);
      const action: PlannerWeekAction = {
        type: "CREATE_WEEK_EVENT",
        payload: {
          semesterId: plannerSemesterIds[0],
          event: makeEvent({ id: "spring-new" }),
        },
      };

      const nextState = plannerWeekStateReducer(state, action);

      expect(nextState[plannerSemesterIds[1]]).toHaveLength(1);
      expect(nextState[plannerSemesterIds[1]]![0].id).toBe("fall-1");
    });
  });

  describe("UPDATE_WEEK_EVENT", () => {
    it("updates an existing event by id", () => {
      const event = makeEvent({ id: "week-1", title: "Old title" });
      const state = cloneState([event]);
      const action: PlannerWeekAction = {
        type: "UPDATE_WEEK_EVENT",
        payload: {
          eventId: "week-1",
          title: "New title",
          category: "Sports",
          day: "Fri",
          startTime: "10:00",
          endTime: "11:00",
          participants: ["Leo"],
        },
      };

      const nextState = plannerWeekStateReducer(state, action);
      const updated = nextState[plannerSemesterIds[0]]!.find(
        (e) => e.id === "week-1",
      );

      expect(updated).toMatchObject({
        title: "New title",
        category: "Sports",
        day: "Fri",
        startTime: "10:00",
        endTime: "11:00",
        participants: ["Leo"],
      });
    });

    it("returns unchanged state when event id does not exist", () => {
      const state = cloneState([makeEvent({ id: "week-1" })]);
      const action: PlannerWeekAction = {
        type: "UPDATE_WEEK_EVENT",
        payload: {
          eventId: "nonexistent",
          title: "Ghost",
          category: "Other",
          day: "Mon",
          startTime: "09:00",
          endTime: "10:00",
          participants: [],
        },
      };

      const nextState = plannerWeekStateReducer(state, action);

      expect(nextState).toBe(state);
    });

    it("finds the event across semesters (fall semester lookup)", () => {
      const fallEvent = makeEvent({ id: "fall-evt", title: "Fall lecture" });
      const state = cloneState([], [fallEvent]);
      const action: PlannerWeekAction = {
        type: "UPDATE_WEEK_EVENT",
        payload: {
          eventId: "fall-evt",
          title: "Updated fall lecture",
          category: "University",
          day: "Thu",
          startTime: "14:00",
          endTime: "15:30",
          participants: [],
        },
      };

      const nextState = plannerWeekStateReducer(state, action);
      const updated = nextState[plannerSemesterIds[1]]!.find(
        (e) => e.id === "fall-evt",
      );

      expect(updated?.title).toBe("Updated fall lecture");
    });
  });

  describe("DELETE_WEEK_EVENT", () => {
    it("removes the event from the correct semester", () => {
      const event = makeEvent({ id: "week-del" });
      const state = cloneState([event]);
      const action: PlannerWeekAction = {
        type: "DELETE_WEEK_EVENT",
        payload: { eventId: "week-del" },
      };

      const nextState = plannerWeekStateReducer(state, action);

      expect(
        nextState[plannerSemesterIds[0]]!.some((e) => e.id === "week-del"),
      ).toBe(false);
    });

    it("returns unchanged state when event id does not exist", () => {
      const state = cloneState([makeEvent({ id: "week-1" })]);
      const action: PlannerWeekAction = {
        type: "DELETE_WEEK_EVENT",
        payload: { eventId: "nonexistent" },
      };

      const nextState = plannerWeekStateReducer(state, action);

      expect(nextState).toBe(state);
    });

    it("removes the event from the fall semester by cross-semester lookup", () => {
      const fallEvent = makeEvent({ id: "fall-del" });
      const state = cloneState([], [fallEvent]);
      const action: PlannerWeekAction = {
        type: "DELETE_WEEK_EVENT",
        payload: { eventId: "fall-del" },
      };

      const nextState = plannerWeekStateReducer(state, action);

      expect(nextState[plannerSemesterIds[1]]).toHaveLength(0);
    });
  });
});
