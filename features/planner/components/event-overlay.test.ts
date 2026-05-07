import { describe, expect, it } from "vitest";
import {
  buildMonthWeekEventLayouts,
  getMonthWeekRowHeight,
} from "./event-overlay";
import { buildMonthDays } from "../lib/planner-utils";
import { type PlannerEvent, type PlannerMonth } from "../lib/planner";

describe("event-overlay layout engine", () => {
  // Setup a standard April 2026 month (Starts on Wednesday, 30 days)
  const month: PlannerMonth = { label: "April", year: 2026, monthIndex: 3 };
  const cells = buildMonthDays(month.year, month.monthIndex);

  describe("buildMonthWeekEventLayouts - Lane Stability", () => {
    it("maintains vertical lane continuity across week boundaries", () => {
      const events: PlannerEvent[] = [
        {
          id: "long-evt",
          title: "Multi-week Task",
          category: "Exam",
          startDate: "2026-04-24", // Friday (Week 4)
          endDate: "2026-04-28", // Tuesday (Week 5)
          participants: [],
        },
      ];

      const layouts = buildMonthWeekEventLayouts({ month, cells, events });

      // Check Week 4 segment
      const week4 = layouts[3].segments.find((s) => s.event.id === "long-evt");
      expect(week4?.lane).toBe(0);

      // Check Week 5 segment - MUST be in the same lane for visual continuity
      const week5 = layouts[4].segments.find((s) => s.event.id === "long-evt");
      expect(week5?.lane).toBe(0);
    });

    it("enforces stable sorting (alphabetical) for overlapping starts", () => {
      const events: PlannerEvent[] = [
        {
          id: "b",
          title: "Beta",
          category: "Other",
          startDate: "2026-04-15",
          endDate: "2026-04-15",
          participants: [],
        },
        {
          id: "a",
          title: "Alpha",
          category: "Other",
          startDate: "2026-04-15",
          endDate: "2026-04-15",
          participants: [],
        },
      ];

      const layouts = buildMonthWeekEventLayouts({ month, cells, events });
      const segments = layouts[2].segments; // Week 3

      // "Alpha" should be in Lane 0 despite being second in the input array
      expect(segments[0].event.title).toBe("Alpha");
      expect(segments[1].event.title).toBe("Beta");
    });
  });

  describe("buildMonthWeekEventLayouts - Edge Cases", () => {
    it("handles weekend boundaries correctly (Sunday to Monday)", () => {
      const events: PlannerEvent[] = [
        {
          id: "weekend-evt",
          title: "Weekend Wrap",
          category: "Private Event",
          startDate: "2026-04-12", // Sunday (Week 2)
          endDate: "2026-04-13", // Monday (Week 3)
          participants: [],
        },
      ];

      const layouts = buildMonthWeekEventLayouts({ month, cells, events });

      // Sunday segment (Round Left, but flat Right)
      const sundaySegment = layouts[1].segments[0];
      expect(sundaySegment.roundLeft).toBe(true);
      expect(sundaySegment.roundRight).toBe(false);

      // Monday segment (Flat Left, Round Right)
      const mondaySegment = layouts[2].segments[0];
      expect(mondaySegment.roundLeft).toBe(false);
      expect(mondaySegment.roundRight).toBe(true);
    });

    it("correctly calculates columnSpan for full-week spanning events", () => {
      const events: PlannerEvent[] = [
        {
          id: "full-week",
          title: "Full Week",
          category: "Other",
          startDate: "2026-04-13", // Monday
          endDate: "2026-04-19", // Sunday
          participants: [],
        },
      ];

      const layouts = buildMonthWeekEventLayouts({ month, cells, events });
      const segment = layouts[2].segments[0];

      expect(segment.startColumn).toBe(1);
      expect(segment.columnSpan).toBe(7);
    });

    it("ignores events completely outside the current month boundaries", () => {
      const events: PlannerEvent[] = [
        {
          id: "march-evt",
          title: "March Event",
          category: "Other",
          startDate: "2026-03-31",
          endDate: "2026-03-31",
          participants: [],
        },
      ];

      const layouts = buildMonthWeekEventLayouts({ month, cells, events });
      const allSegments = layouts.flatMap((l) => l.segments);
      expect(allSegments).toHaveLength(0);
    });

    it("gracefully handles an empty events array", () => {
      const layouts = buildMonthWeekEventLayouts({ month, cells, events: [] });
      expect(layouts).toHaveLength(Math.ceil(cells.length / 7));
      expect(layouts[0].segments).toEqual([]);
    });
  });

  describe("getMonthWeekRowHeight", () => {
    it("calculates height based on minimum lane padding", () => {
      const minHeight = getMonthWeekRowHeight(0);
      const threeLaneHeight = getMonthWeekRowHeight(3);
      expect(minHeight).toBe(threeLaneHeight);
    });

    it("expands dynamically for heavy event density", () => {
      const fourLaneHeight = getMonthWeekRowHeight(4);
      const standardHeight = getMonthWeekRowHeight(3);
      expect(fourLaneHeight).toBeGreaterThan(standardHeight);
    });
  });
});
