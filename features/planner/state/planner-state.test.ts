import { describe, expect, it } from "vitest";
import { getInboxEventsFromState, plannerStateReducer } from "./planner-state";
import {
  plannerSemesterIds,
  eventOverlapsSemester,
  buildSemester,
  getAvailableSemesters,
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

    it("safely removes the last remaining participant resulting in an empty array", () => {
      const flatEvents: PlannerEvent[] = [
        {
          id: "evt-solo",
          title: "Solo Event",
          category: "Group Event",
          startDate: "2026-05-10",
          endDate: "2026-05-10",
          participants: ["SoloUser"],
        },
      ];

      const action = {
        type: "TOGGLE_PARTICIPANT" as const,
        payload: { eventId: "evt-solo", participantName: "SoloUser" },
      };

      const nextFlat = plannerStateReducer(flatEvents, action);
      expect(nextFlat[0].participants).toEqual([]);
    });

    it("handles undefined or missing participants gracefully without throwing", () => {
      const malformedFlat = [
        {
          id: "evt-malformed",
          title: "Malformed Event",
          category: "Other" as const,
          startDate: "2026-05-10",
          endDate: "2026-05-10",
        } as PlannerEvent,
      ];

      const action = {
        type: "TOGGLE_PARTICIPANT" as const,
        payload: { eventId: "evt-malformed", participantName: "NewUser" },
      };

      expect(() => plannerStateReducer(malformedFlat, action)).not.toThrow();
      const result = plannerStateReducer(malformedFlat, action);
      expect(result[0].participants).toEqual(["NewUser"]);
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

  describe("Realtime Remote Sync", () => {
    it("handles REMOTE_UPSERT_EVENT for a new event", () => {
      const remoteEvent: PlannerEvent = {
        id: "evt-remote-1",
        title: "Remote Sync Event",
        category: "Exam",
        startDate: "2026-05-10",
        endDate: "2026-05-10",
        participants: ["Leo"],
      };

      const action = {
        type: "REMOTE_UPSERT_EVENT" as const,
        payload: { semesterId: semesterIds[0], event: remoteEvent },
      };

      const nextState = plannerStateReducer(testState, action);
      const found = nextState[semesterIds[0]].find((e) => e.id === "evt-remote-1");
      expect(found).toBeDefined();
      expect(found?.title).toBe("Remote Sync Event");
    });

    it("handles REMOTE_UPSERT_EVENT updating an existing event", () => {
      const updatedEvent: PlannerEvent = {
        id: "evt-1",
        title: "Active Picnic Updated",
        category: "Group Event",
        startDate: "2026-04-12",
        endDate: "2026-04-12",
        participants: ["Maya", "Leo", "Alex"],
      };

      const action = {
        type: "REMOTE_UPSERT_EVENT" as const,
        payload: { semesterId: semesterIds[0], event: updatedEvent },
      };

      const nextState = plannerStateReducer(testState, action);
      const found = nextState[semesterIds[0]].find((e) => e.id === "evt-1");
      expect(found?.title).toBe("Active Picnic Updated");
      expect(found?.participants).toContain("Alex");
    });

    it("handles REMOTE_UPSERT_EVENT when an event was moved to another semester", () => {
      const movedEvent: PlannerEvent = {
        id: "evt-inbox-2", // Was originally in semesterIds[1]
        title: "Winter Cabin",
        category: "Group Event",
        startDate: "2026-04-20",
        endDate: "2026-04-20",
        participants: ["Leo"],
      };

      const action = {
        type: "REMOTE_UPSERT_EVENT" as const,
        payload: { semesterId: semesterIds[0], event: movedEvent },
      };

      const nextState = plannerStateReducer(testState, action);
      expect(nextState[semesterIds[1]].find((e) => e.id === "evt-inbox-2")).toBeUndefined();
      expect(nextState[semesterIds[0]].find((e) => e.id === "evt-inbox-2")).toBeDefined();
    });

    it("handles REMOTE_DELETE_EVENT for an event", () => {
      const action = {
        type: "REMOTE_DELETE_EVENT" as const,
        payload: { eventId: "evt-1" },
      };

      const nextState = plannerStateReducer(testState, action);
      expect(nextState[semesterIds[0]].find((e) => e.id === "evt-1")).toBeUndefined();
    });
  });
});

describe("getInboxEventsFromState", () => {
  it("extracts only undated events and sorts them alphabetically from legacy dict", () => {
    const inbox = getInboxEventsFromState(testState);

    expect(inbox).toHaveLength(2);
    expect(inbox[0].title).toBe("Beach idea");
    expect(inbox[1].title).toBe("Winter Cabin");
  });

  it("extracts only undated events and sorts them alphabetically from flat array", () => {
    const flatEvents: PlannerEvent[] = [
      {
        id: "evt-1",
        title: "Dated Event",
        category: "Exam",
        startDate: "2026-05-01",
        endDate: "2026-05-01",
        participants: [],
      },
      {
        id: "inbox-z",
        title: "Zoo Trip",
        category: "Group Event",
        startDate: null,
        endDate: null,
        participants: [],
      },
      {
        id: "inbox-a",
        title: "Aquarium Visit",
        category: "Group Event",
        startDate: null,
        endDate: null,
        participants: [],
      },
    ];

    const inbox = getInboxEventsFromState(flatEvents);
    expect(inbox).toHaveLength(2);
    expect(inbox[0].title).toBe("Aquarium Visit");
    expect(inbox[1].title).toBe("Zoo Trip");
  });
});

describe("plannerStateReducer with Flat List State", () => {
  const initialFlatEvents: PlannerEvent[] = [
    {
      id: "evt-1",
      title: "Spring Picnic",
      category: "Group Event",
      startDate: "2026-04-15",
      endDate: "2026-04-15",
      participants: ["Maya", "Leo"],
    },
    {
      id: "evt-border",
      title: "Semester Transition Trip",
      category: "Group Event",
      startDate: "2026-09-28",
      endDate: "2026-10-04",
      participants: ["Maya"],
    },
    {
      id: "evt-inbox",
      title: "Future Idea",
      category: "Other",
      startDate: null,
      endDate: null,
      participants: [],
    },
  ];

  it("handles CREATE_EVENT in flat list", () => {
    const newEvent: PlannerEvent = {
      id: "evt-future",
      title: "Graduation Party",
      category: "Group Event",
      startDate: "2027-05-10",
      endDate: "2027-05-10",
      participants: ["Leo"],
    };

    const next = plannerStateReducer(initialFlatEvents, {
      type: "CREATE_EVENT",
      payload: { semesterId: "spring-2027", event: newEvent },
    });

    expect(next).toHaveLength(4);
    expect(next.find((e: PlannerEvent) => e.id === "evt-future")).toEqual(newEvent);
  });

  it("handles UPDATE_EVENT in flat list", () => {
    const next = plannerStateReducer(initialFlatEvents, {
      type: "UPDATE_EVENT",
      payload: {
        eventId: "evt-1",
        title: "Spring Picnic Updated",
        description: "Updated notes",
        category: "Group Event",
        startDate: "2026-04-16",
        endDate: "2026-04-16",
        participants: ["Maya", "Leo", "Alex"],
      },
    });

    const updated = next.find((e: PlannerEvent) => e.id === "evt-1");
    expect(updated?.title).toBe("Spring Picnic Updated");
    expect(updated?.startDate).toBe("2026-04-16");
    expect(updated?.participants).toEqual(["Maya", "Leo", "Alex"]);
  });

  it("handles DELETE_EVENT in flat list", () => {
    const next = plannerStateReducer(initialFlatEvents, {
      type: "DELETE_EVENT",
      payload: { eventId: "evt-1" },
    });

    expect(next).toHaveLength(2);
    expect(next.find((e: PlannerEvent) => e.id === "evt-1")).toBeUndefined();
  });

  it("handles MOVE_EVENT_TO_DATE and clamps dates prior to 2026-04-01", () => {
    // Attempting to move event to March 2026 (prior to origin date 2026-04-01)
    const next = plannerStateReducer(initialFlatEvents, {
      type: "MOVE_EVENT_TO_DATE",
      payload: {
        eventId: "evt-inbox",
        dateKey: "2026-01-15",
        targetSemesterId: "spring-2026",
      },
    });

    const moved = next.find((e: PlannerEvent) => e.id === "evt-inbox");
    expect(moved?.startDate).toBe("2026-04-01");
    expect(moved?.endDate).toBe("2026-04-01");
  });

  it("handles MOVE_EVENT_TO_INBOX by clearing start and end dates", () => {
    const next = plannerStateReducer(initialFlatEvents, {
      type: "MOVE_EVENT_TO_INBOX",
      payload: { eventId: "evt-1" },
    });

    const moved = next.find((e: PlannerEvent) => e.id === "evt-1");
    expect(moved?.startDate).toBeNull();
    expect(moved?.endDate).toBeNull();
  });

  it("handles REMOTE_UPSERT_EVENT for both insert and update in flat list", () => {
    const insertedEvent: PlannerEvent = {
      id: "evt-remote-new",
      title: "Remote Broadcast Event",
      category: "Exam",
      startDate: "2026-06-01",
      endDate: "2026-06-01",
      participants: [],
    };

    // Insert
    let next = plannerStateReducer(initialFlatEvents, {
      type: "REMOTE_UPSERT_EVENT",
      payload: { event: insertedEvent },
    });
    expect(next).toHaveLength(4);
    expect(next.find((e: PlannerEvent) => e.id === "evt-remote-new")).toBeDefined();

    // Update
    const updatedInsertedEvent = { ...insertedEvent, title: "Remote Broadcast Event (Edited)" };
    next = plannerStateReducer(next, {
      type: "REMOTE_UPSERT_EVENT",
      payload: { event: updatedInsertedEvent },
    });
    expect(next).toHaveLength(4);
    expect(next.find((e: PlannerEvent) => e.id === "evt-remote-new")?.title).toBe(
      "Remote Broadcast Event (Edited)",
    );
  });

  it("handles REMOTE_DELETE_EVENT in flat list", () => {
    const next = plannerStateReducer(initialFlatEvents, {
      type: "REMOTE_DELETE_EVENT",
      payload: { eventId: "evt-border" },
    });

    expect(next).toHaveLength(2);
    expect(next.find((e: PlannerEvent) => e.id === "evt-border")).toBeUndefined();
  });
});

describe("Cross-Semester & Border Cases Querying", () => {
  const spring2026 = buildSemester("spring", 2026);
  const fall2026 = buildSemester("fall", 2026);
  const spring2027 = buildSemester("spring", 2027);

  it("resolves border events spanning across semester boundaries in both semesters", () => {
    const crossBorderEvent: PlannerEvent = {
      id: "evt-cross-border",
      title: "Cross Border Trip",
      category: "Group Event",
      startDate: "2026-09-28", // In Spring 2026
      endDate: "2026-10-04",   // In Fall 2026
      participants: [],
    };

    // Spring 2026 bounds: 2026-04-01 to 2026-09-30
    // Fall 2026 bounds: 2026-10-01 to 2027-03-31
    expect(eventOverlapsSemester(crossBorderEvent, spring2026)).toBe(true);
    expect(eventOverlapsSemester(crossBorderEvent, fall2026)).toBe(true);
    expect(eventOverlapsSemester(crossBorderEvent, spring2027)).toBe(false);
  });

  it("resolves future events for their respective dynamically generated semester", () => {
    const futureEvent: PlannerEvent = {
      id: "evt-future-2027",
      title: "May 2027 Conference",
      category: "Exam",
      startDate: "2027-05-10",
      endDate: "2027-05-12",
      participants: [],
    };

    expect(eventOverlapsSemester(futureEvent, spring2026)).toBe(false);
    expect(eventOverlapsSemester(futureEvent, fall2026)).toBe(false);
    expect(eventOverlapsSemester(futureEvent, spring2027)).toBe(true);
  });

  it("dynamically extends available semesters when events exist in future semesters", () => {
    const farFutureEvent: PlannerEvent = {
      id: "evt-far-future",
      title: "2028 Study Trip",
      category: "Group Event",
      startDate: "2028-05-01",
      endDate: "2028-05-05",
      participants: [],
    };

    // Fixed mock date: Oct 2026 (current = fall-2026, default max = spring-2027)
    const refDate = new Date(2026, 9, 15);
    const available = getAvailableSemesters([farFutureEvent], refDate);
    const ids = available.map((s) => s.id);

    expect(ids).toContain("spring-2026");
    expect(ids).toContain("fall-2026");
    expect(ids).toContain("spring-2027");
    expect(ids).toContain("fall-2027");
    expect(ids).toContain("spring-2028");
  });
});


