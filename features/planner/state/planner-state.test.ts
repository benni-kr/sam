import { describe, expect, it } from "vitest";
import { getInboxEventsFromState, plannerStateReducer } from "./planner-state";
import {
  plannerSemesterIds,
  type PlannerEvent,
  type PlannerSemesterId,
} from "../lib/planner";

// We define this to match the internal type expected by the reducer
type EventsBySemester = Record<PlannerSemesterId, PlannerEvent[]>;

const semesterIds = plannerSemesterIds;

// Explicitly type and assert the test state
const testState = {
  [semesterIds[0]]: [
    {
      id: "evt-1",
      title: "Active Picnic",
      category: "Group Event",
      startDate: "2026-04-11",
      endDate: "2026-04-11",
      participants: ["Maya", "Leo"],
    },
    {
      id: "evt-inbox-1",
      title: "Beach idea",
      category: "Group Event",
      startDate: null,
      endDate: null,
      participants: ["Maya"],
    },
  ],
  [semesterIds[1]]: [
    {
      id: "evt-inbox-2",
      title: "Winter Cabin",
      category: "Group Event",
      startDate: null,
      endDate: null,
      participants: ["Leo"],
    },
  ],
} as EventsBySemester;

describe("plannerStateReducer", () => {
  describe("Event Movement", () => {
    it("moves an event from inbox to a specific date", () => {
      const action = {
        type: "MOVE_EVENT_TO_DATE" as const,
        payload: {
          eventId: "evt-inbox-1",
          dateKey: "2026-04-15",
          targetSemesterId: semesterIds[0],
        },
      };

      const nextState = plannerStateReducer(testState, action);
      const moved = nextState[semesterIds[0]].find(
        (e) => e.id === "evt-inbox-1",
      );

      expect(moved?.startDate).toBe("2026-04-15");
      expect(moved?.endDate).toBe("2026-04-15"); // Duration 1 logic
    });

    it("handles cross-semester moves (rehoming an inbox item)", () => {
      // Scenario: Event is in Semester 1 (Fall) inbox, but user drags it
      // into Semester 0 (Spring) calendar.
      const action = {
        type: "MOVE_EVENT_TO_DATE" as const,
        payload: {
          eventId: "evt-inbox-2",
          dateKey: "2026-05-01",
          targetSemesterId: semesterIds[0],
        },
      };

      const nextState = plannerStateReducer(testState, action);

      // Should be GONE from Semester 1
      expect(nextState[semesterIds[1]]).toHaveLength(0);
      // Should be ADDED to Semester 0
      expect(
        nextState[semesterIds[0]].find((e) => e.id === "evt-inbox-2"),
      ).toBeDefined();
    });

    it("clears dates when moving an event back to the inbox", () => {
      const action = {
        type: "MOVE_EVENT_TO_INBOX" as const,
        payload: { eventId: "evt-1" },
      };

      const nextState = plannerStateReducer(testState, action);
      const moved = nextState[semesterIds[0]].find((e) => e.id === "evt-1");

      expect(moved?.startDate).toBeNull();
      expect(moved?.endDate).toBeNull();
    });
  });

  describe("Participant Synchronization (DDD Cascade)", () => {
    it("toggles a participant on an event", () => {
      const action = {
        type: "TOGGLE_PARTICIPANT" as const,
        payload: { eventId: "evt-1", participantName: "Leo" },
      };

      // Leo is already there, so he should be removed
      let state = plannerStateReducer(testState, action);
      expect(state[semesterIds[0]][0].participants).not.toContain("Leo");

      // Toggle again, he should be added back
      state = plannerStateReducer(state, action);
      expect(state[semesterIds[0]][0].participants).toContain("Leo");
    });

    it("removes a participant from EVERY event across all semesters", () => {
      const action = {
        type: "REMOVE_PARTICIPANT_FROM_ALL_EVENTS" as const,
        payload: { participantName: "Maya" },
      };

      const nextState = plannerStateReducer(testState, action);

      // Check multiple events in different semesters
      expect(nextState[semesterIds[0]][0].participants).not.toContain("Maya");
      expect(nextState[semesterIds[0]][1].participants).not.toContain("Maya");
    });

    it("renames a participant everywhere and dedupes the result", () => {
      const action = {
        type: "RENAME_PARTICIPANT_IN_ALL_EVENTS" as const,
        payload: { currentName: "Maya", nextName: "May" },
      };

      const nextState = plannerStateReducer(testState, action);

      expect(nextState[semesterIds[0]][0].participants).toContain("May");
      expect(nextState[semesterIds[0]][0].participants).not.toContain("Maya");
    });
  });

  describe("Basic Mutations", () => {
    it("creates a new event in the specified semester", () => {
      const newEvent: PlannerEvent = {
        id: "new",
        title: "Test",
        category: "Other",
        startDate: null,
        endDate: null,
        participants: [],
      };
      const action = {
        type: "CREATE_EVENT" as const,
        payload: { semesterId: semesterIds[0], event: newEvent },
      };

      const nextState = plannerStateReducer(testState, action);
      expect(nextState[semesterIds[0]]).toHaveLength(3);
    });

    it("deletes an event correctly", () => {
      const action = {
        type: "DELETE_EVENT" as const,
        payload: { eventId: "evt-1" },
      };

      const nextState = plannerStateReducer(testState, action);
      expect(
        nextState[semesterIds[0]].find((e) => e.id === "evt-1"),
      ).toBeUndefined();
    });
  });
});

describe("getInboxEventsFromState", () => {
  it("extracts only undated events and sorts them alphabetically", () => {
    const inbox = getInboxEventsFromState(testState);

    expect(inbox).toHaveLength(2);
    expect(inbox[0].title).toBe("Beach idea");
    expect(inbox[1].title).toBe("Winter Cabin");
  });
});
