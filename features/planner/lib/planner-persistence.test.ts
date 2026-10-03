import { describe, expect, it } from "vitest";
import { defaultPlannerSemesterId, type PlannerEvent } from "../lib/planner";
import {
  rowsToEventsBySemester,
  normalizeParticipants,
  eventToRow,
  rowToPlannerEvent,
} from "./planner-persistence";

describe("Planner Persistence Data Integrity", () => {
  describe("normalizeParticipants", () => {
    it("converts broken/null database values into valid empty arrays", () => {
      expect(normalizeParticipants(null)).toEqual([]);
      expect(normalizeParticipants(undefined)).toEqual([]);
      expect(normalizeParticipants("not-an-array")).toEqual([]);
    });

    it("cleans up whitespace and removes empty strings from participants", () => {
      const dirtyData = ["  Maya  ", "", "Leo", "   "];
      expect(normalizeParticipants(dirtyData)).toEqual(["Maya", "Leo"]);
    });
  });

  describe("rowsToEventsBySemester", () => {
    it("defaults unknown categories from the database to Other rather than dropping the event", () => {
      const mockRows = [
        {
          planner_scope: "default",
          semester_id: "spring-2026",
          event_id: "valid-1",
          title: "Good Event",
          category: "Exam", // Valid
          start_date: null,
          end_date: null,
          participants: [],
        },
        {
          planner_scope: "default",
          semester_id: "spring-2026",
          event_id: "unknown-cat-1",
          title: "Custom Category Event",
          category: "Custom-Category", // Unknown
          start_date: null,
          end_date: null,
          participants: [],
        },
      ];

      // @ts-expect-error - intentional invalid input for testing
      const result = rowsToEventsBySemester(mockRows);

      expect(result["spring-2026"]).toHaveLength(2);
      expect(result["spring-2026"]?.[0].id).toBe("valid-1");
      expect(result["spring-2026"]?.[1].id).toBe("unknown-cat-1");
      expect(result["spring-2026"]?.[1].category).toBe("Other");
    });

    it("defaults events with missing semester_id to the default semester", () => {
      const mockRows = [
        {
          planner_scope: "default",
          semester_id: null, // Missing
          event_id: "orphan-1",
          title: "Orphan",
          description: null,
          category: "Other",
          start_date: null,
          end_date: null,
          participants: [],
        },
      ];

      const result = rowsToEventsBySemester(mockRows);

      // Should land in default semester
      expect(result[defaultPlannerSemesterId]).toBeDefined();
      expect(
        result[defaultPlannerSemesterId]?.some((e: PlannerEvent) => e.id === "orphan-1"),
      ).toBe(true);
    });

    it("correctly converts eventToRow and rowToPlannerEvent bidirectionally", () => {
      const event: PlannerEvent = {
        id: "evt-123",
        title: "Aachen Trip",
        description: "Great trip",
        category: "Group Event",
        startDate: "2026-06-01",
        endDate: "2026-06-03",
        participants: ["Benjamin", "Malte"],
      };

      const row = eventToRow(event, undefined, "test-scope");
      expect(row).toEqual({
        planner_scope: "test-scope",
        event_id: "evt-123",
        title: "Aachen Trip",
        description: "Great trip",
        category: "Group Event",
        start_date: "2026-06-01",
        end_date: "2026-06-03",
        start_time: null,
        end_time: null,
        participants: ["Benjamin", "Malte"],
      });

      const converted = rowToPlannerEvent(row);
      expect(converted?.semesterId).toBe("spring-2026");
      expect(converted?.event).toEqual(event);
    });

    it("correctly preserves startTime and endTime during conversion", () => {
      const timedEvent: PlannerEvent = {
        id: "evt-timed",
        title: "Lecture",
        category: "Exam",
        startDate: "2026-05-10",
        endDate: "2026-05-10",
        startTime: "10:15",
        endTime: "11:45",
        participants: [],
      };

      const row = eventToRow(timedEvent, undefined, "test-scope");
      expect(row.start_time).toBe("10:15");
      expect(row.end_time).toBe("11:45");

      const converted = rowToPlannerEvent(row);
      expect(converted?.event.startTime).toBe("10:15");
      expect(converted?.event.endTime).toBe("11:45");
    });
  });
});
