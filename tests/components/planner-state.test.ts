import { describe, expect, it } from "vitest";

import {
  getInboxEventsFromState,
  plannerStateReducer,
} from "../../components/planner/planner-state";
import { plannerSemesters, type PlannerEvent } from "../../lib/planner";

const semesterIds = plannerSemesters.map((semester) => semester.id) as [
  (typeof plannerSemesters)[number]["id"],
  (typeof plannerSemesters)[number]["id"],
];

type PlannerState = Record<(typeof semesterIds)[number], PlannerEvent[]>;
type PlannerStateAction = Parameters<typeof plannerStateReducer>[1];

function cloneState(): PlannerState {
  return {
    [semesterIds[0]]: plannerSemesters[0].events.map((event) => ({
      ...event,
      participants: [...event.participants],
    })),
    [semesterIds[1]]: plannerSemesters[1].events.map((event) => ({
      ...event,
      participants: [...event.participants],
    })),
  };
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
