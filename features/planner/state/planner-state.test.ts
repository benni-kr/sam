import { describe, expect, it } from "vitest";

import { getInboxEventsFromState, plannerStateReducer } from "./planner-state";
import { plannerSemesterIds, type PlannerEvent } from "../lib/planner";

const semesterIds = plannerSemesterIds as [
  (typeof plannerSemesterIds)[number],
  (typeof plannerSemesterIds)[number],
];

type PlannerState = Record<(typeof semesterIds)[number], PlannerEvent[]>;
type PlannerStateAction = Parameters<typeof plannerStateReducer>[1];

const testState: PlannerState = {
  [semesterIds[0]]: [
    {
      id: "evt-1",
      title: "Semester kickoff picnic",
      category: "Group Event",
      startDate: "2026-04-11",
      endDate: "2026-04-11",
      participants: ["Maya", "Leo", "Nina"],
    },
    {
      id: "evt-7",
      title: "Beach day idea",
      category: "Group Event",
      startDate: null,
      endDate: null,
      participants: ["Maya", "Leo", "Nina"],
    },
    {
      id: "evt-8",
      title: "Budget brunch",
      category: "Private Event",
      startDate: null,
      endDate: null,
      participants: ["Ava", "Sam"],
    },
  ],
  [semesterIds[1]]: [
    {
      id: "evt-16",
      title: "Shared budget ideas",
      category: "Private Event",
      startDate: null,
      endDate: null,
      participants: ["Ava", "Mika", "Sam"],
    },
    {
      id: "evt-17",
      title: "Venue shortlist",
      category: "Group Event",
      startDate: null,
      endDate: null,
      participants: ["Jules", "Maya"],
    },
  ],
} as PlannerState;

function cloneState(): PlannerState {
  return {
    [semesterIds[0]]: testState[semesterIds[0]].map((event) => ({
      ...event,
      participants: [...event.participants],
    })),
    [semesterIds[1]]: testState[semesterIds[1]].map((event) => ({
      ...event,
      participants: [...event.participants],
    })),
  } as PlannerState;
}

describe("plannerStateReducer", () => {
  it("adds a new event to the active semester", () => {
    const state = cloneState();
    const action: PlannerStateAction = {
      type: "CREATE_EVENT",
      payload: {
        semesterId: semesterIds[0],
        event: {
          id: "evt-new",
          title: "New event",
          category: "Other",
          startDate: null,
          endDate: null,
          participants: ["Maya"],
        },
      },
    };

    const nextState = plannerStateReducer(state, action);

    expect(nextState[semesterIds[0]]).toHaveLength(
      state[semesterIds[0]].length + 1,
    );
    expect(nextState[semesterIds[0]].at(-1)).toMatchObject({
      id: "evt-new",
      title: "New event",
      category: "Other",
      startDate: null,
      endDate: null,
    });
  });

  it("updates an existing event in place", () => {
    const state = cloneState();
    const action: PlannerStateAction = {
      type: "UPDATE_EVENT",
      payload: {
        eventId: "evt-1",
        title: "Updated kickoff picnic",
        category: "Other",
        startDate: "2026-04-12",
        endDate: "2026-04-13",
        participants: ["Ava", "Maya"],
      },
    };

    const nextState = plannerStateReducer(state, action);
    const updatedEvent = nextState[semesterIds[0]].find(
      (event) => event.id === "evt-1",
    );

    expect(updatedEvent).toMatchObject({
      title: "Updated kickoff picnic",
      category: "Other",
      startDate: "2026-04-12",
      endDate: "2026-04-13",
      participants: ["Ava", "Maya"],
    });
  });

  it("deletes an event from its semester", () => {
    const state = cloneState();
    const action: PlannerStateAction = {
      type: "DELETE_EVENT",
      payload: {
        eventId: "evt-1",
      },
    };

    const nextState = plannerStateReducer(state, action);

    expect(
      nextState[semesterIds[0]].some((event) => event.id === "evt-1"),
    ).toBe(false);
  });
});

describe("getInboxEventsFromState", () => {
  it("returns unscheduled events across all semesters", () => {
    const inboxEvents = getInboxEventsFromState(cloneState());

    expect(inboxEvents.map((event) => event.title)).toEqual([
      "Beach day idea",
      "Budget brunch",
      "Shared budget ideas",
      "Venue shortlist",
    ]);
  });
});
