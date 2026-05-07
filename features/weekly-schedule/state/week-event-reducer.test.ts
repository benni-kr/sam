import { describe, expect, it } from "vitest";

import {
  plannerWeekStateReducer,
  type PlannerWeekAction,
} from "./week-event-reducer";
import { type PlannerWeekEventsBySemester } from "../../weekly-schedule/lib/week-persistence";
import { plannerSemesterIds } from "../../planner/lib/planner";
import type { PlannerWeekEvent } from "@/features/weekly-schedule/lib/week-types";

// --- Helpers ---

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

// --- Test Suite ---

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
      const originalParticipants =
        hydrated[plannerSemesterIds[0]]![0].participants;
      const clonedParticipants =
        nextState[plannerSemesterIds[0]]![0].participants;

      expect(clonedParticipants).toEqual(originalParticipants);
      expect(clonedParticipants).not.toBe(originalParticipants);
    });

    it("populates all semesters from the hydrated store", () => {
      const springEvent = makeEvent({ id: "spring-1", title: "Spring" });
      const fallEvent = makeEvent({ id: "fall-1", title: "Fall", day: "Wed" });
      const hydrated = cloneState([springEvent], [fallEvent]);

      const action: PlannerWeekAction = {
        type: "HYDRATE_WEEK_FROM_STORE",
        payload: { weekEventsBySemester: hydrated },
      };

      const nextState = plannerWeekStateReducer(cloneState(), action);

      expect(nextState[plannerSemesterIds[0]]).toHaveLength(1);
      expect(nextState[plannerSemesterIds[1]]).toHaveLength(1);
    });

    it("completely replaces existing state (overwrite test)", () => {
      const oldState = cloneState([
        makeEvent({ id: "old", title: "Remove Me" }),
      ]);
      const hydrated = cloneState([makeEvent({ id: "new", title: "Fresh" })]);

      const action: PlannerWeekAction = {
        type: "HYDRATE_WEEK_FROM_STORE",
        payload: { weekEventsBySemester: hydrated },
      };

      const nextState = plannerWeekStateReducer(oldState, action);

      expect(nextState[plannerSemesterIds[0]]).toHaveLength(1);
      expect(nextState[plannerSemesterIds[0]]![0].id).toBe("new");
    });
  });

  describe("Immutability Checks", () => {
    it("returns a new object reference for the semester array on CREATE", () => {
      const state = cloneState();
      const action: PlannerWeekAction = {
        type: "CREATE_WEEK_EVENT",
        payload: { semesterId: plannerSemesterIds[0], event: makeEvent() },
      };

      const nextState = plannerWeekStateReducer(state, action);
      expect(nextState[plannerSemesterIds[0]]).not.toBe(
        state[plannerSemesterIds[0]],
      );
    });

    it("returns a new object reference for the semester array on DELETE", () => {
      const state = cloneState([makeEvent({ id: "del" })]);
      const action: PlannerWeekAction = {
        type: "DELETE_WEEK_EVENT",
        payload: { eventId: "del" },
      };

      const nextState = plannerWeekStateReducer(state, action);
      expect(nextState[plannerSemesterIds[0]]).not.toBe(
        state[plannerSemesterIds[0]],
      );
    });
  });

  describe("CREATE_WEEK_EVENT", () => {
    it("appends a new event to the target semester", () => {
      const state = cloneState([makeEvent()]);
      const action: PlannerWeekAction = {
        type: "CREATE_WEEK_EVENT",
        payload: {
          semesterId: plannerSemesterIds[0],
          event: makeEvent({ id: "new", title: "New lecture" }),
        },
      };

      const nextState = plannerWeekStateReducer(state, action);
      expect(nextState[plannerSemesterIds[0]]).toHaveLength(2);
    });

    it("does not mutate the other semester", () => {
      const state = cloneState([], [makeEvent({ id: "fall-1" })]);
      const action: PlannerWeekAction = {
        type: "CREATE_WEEK_EVENT",
        payload: {
          semesterId: plannerSemesterIds[0],
          event: makeEvent({ id: "spring-new" }),
        },
      };

      const nextState = plannerWeekStateReducer(state, action);
      expect(nextState[plannerSemesterIds[1]]).toHaveLength(1);
    });
  });

  describe("UPDATE_WEEK_EVENT", () => {
    it("updates an existing event by id", () => {
      const state = cloneState([makeEvent({ id: "upd", title: "Old" })]);
      const action: PlannerWeekAction = {
        type: "UPDATE_WEEK_EVENT",
        payload: {
          eventId: "upd",
          title: "New",
          category: "Sports",
          day: "Fri",
          startTime: "10:00",
          endTime: "11:00",
          participants: ["Leo"],
        },
      };

      const nextState = plannerWeekStateReducer(state, action);
      const updated = nextState[plannerSemesterIds[0]]!.find(
        (e) => e.id === "upd",
      );
      expect(updated?.title).toBe("New");
    });

    it("returns unchanged state when event id does not exist", () => {
      const state = cloneState([makeEvent({ id: "exists" })]);
      const action: PlannerWeekAction = {
        type: "UPDATE_WEEK_EVENT",
        payload: {
          eventId: "missing",
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
  });

  describe("DELETE_WEEK_EVENT", () => {
    it("removes the event from the correct semester", () => {
      const state = cloneState([makeEvent({ id: "del" })]);
      const action: PlannerWeekAction = {
        type: "DELETE_WEEK_EVENT",
        payload: { eventId: "del" },
      };

      const nextState = plannerWeekStateReducer(state, action);
      expect(
        nextState[plannerSemesterIds[0]]!.some((e) => e.id === "del"),
      ).toBe(false);
    });

    it("removes the event from the fall semester by cross-semester lookup", () => {
      const state = cloneState([], [makeEvent({ id: "fall-del" })]);
      const action: PlannerWeekAction = {
        type: "DELETE_WEEK_EVENT",
        payload: { eventId: "fall-del" },
      };

      const nextState = plannerWeekStateReducer(state, action);
      expect(nextState[plannerSemesterIds[1]]).toHaveLength(0);
    });
  });
});
