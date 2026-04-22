import { describe, expect, it } from "vitest";

import {
  buildMonthWeekEventLayouts,
  getMonthWeekRowHeight,
} from "../../components/planner/event-overlay";
import {
  buildMonthDays,
  type PlannerEvent,
  type PlannerMonth,
} from "../../lib/planner";

describe("buildMonthWeekEventLayouts", () => {
  it("splits multi-day events across week rows with stable lane assignment", () => {
    const month: PlannerMonth = { label: "April", year: 2026, monthIndex: 3 };
    const cells = buildMonthDays(month.year, month.monthIndex);

    const events: PlannerEvent[] = [
      {
        id: "evt-long",
        title: "Long Event",
        category: "Exam",
        startDate: "2026-04-24",
        endDate: "2026-04-28",
        participants: [],
      },
      {
        id: "evt-overlap",
        title: "Overlap",
        category: "Group Event",
        startDate: "2026-04-25",
        endDate: "2026-04-25",
        participants: [],
      },
    ];

    const layouts = buildMonthWeekEventLayouts({ month, cells, events });

    const weekFour = layouts[3];
    expect(weekFour.laneCount).toBe(2);

    const longInWeekFour = weekFour.segments.find(
      (segment) => segment.event.id === "evt-long",
    );
    expect(longInWeekFour).toMatchObject({
      startColumn: 5,
      columnSpan: 3,
      lane: 0,
      showLabel: true,
      roundLeft: true,
      roundRight: false,
    });

    const overlapInWeekFour = weekFour.segments.find(
      (segment) => segment.event.id === "evt-overlap",
    );
    expect(overlapInWeekFour).toMatchObject({
      startColumn: 6,
      columnSpan: 1,
      lane: 1,
    });

    const weekFive = layouts[4];
    const longInWeekFive = weekFive.segments.find(
      (segment) => segment.event.id === "evt-long",
    );

    expect(longInWeekFive).toMatchObject({
      startColumn: 1,
      columnSpan: 2,
      showLabel: false,
      roundLeft: false,
      roundRight: true,
    });
  });
});

describe("getMonthWeekRowHeight", () => {
  it("keeps a minimum height for up to three lanes", () => {
    expect(getMonthWeekRowHeight(0)).toBe(getMonthWeekRowHeight(3));
  });

  it("grows when lanes exceed the minimum", () => {
    expect(getMonthWeekRowHeight(4)).toBeGreaterThan(getMonthWeekRowHeight(3));
  });
});
