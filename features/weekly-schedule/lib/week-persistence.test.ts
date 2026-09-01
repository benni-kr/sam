import { describe, expect, it } from "vitest";
import {
  rowToPlannerWeekEvent,
  weekEventToRow,
  rowsToWeekEventsBySemester,
  normalizeParticipants,
  type SupabaseWeekEventRow,
} from "./week-persistence";
import { plannerSemesterIds } from "@/features/planner/lib/planner";
import type { PlannerWeekEvent } from "./week-types";

describe("Weekly Schedule Persistence Data Integrity", () => {
  it("converts a Supabase row to PlannerWeekEvent preserving all fields including description", () => {
    const row: SupabaseWeekEventRow = {
      planner_scope: "test-scope",
      semester_id: plannerSemesterIds[0],
      event_id: "wevt-123",
      title: "Algorithms lecture",
      description: "Room 101, Prof. Smith",
      category: "University",
      day: "Mon",
      start_time: "08:15",
      end_time: "09:45",
      participants: ["Alice", "Bob"],
    };

    const result = rowToPlannerWeekEvent(row);
    expect(result).not.toBeNull();
    expect(result?.semesterId).toBe(plannerSemesterIds[0]);
    expect(result?.event).toEqual({
      id: "wevt-123",
      title: "Algorithms lecture",
      description: "Room 101, Prof. Smith",
      category: "University",
      day: "Mon",
      startTime: "08:15",
      endTime: "09:45",
      participants: ["Alice", "Bob"],
    });
  });

  it("converts a PlannerWeekEvent to a Supabase row bidirectional round-trip", () => {
    const originalEvent: PlannerWeekEvent = {
      id: "wevt-456",
      title: "Football Training",
      description: "Bring water bottle",
      category: "Sports",
      day: "Thu",
      startTime: "18:00",
      endTime: "19:30",
      participants: ["Maya", "Leo"],
    };

    const row = weekEventToRow(originalEvent, plannerSemesterIds[0], "test-scope");
    expect(row).toEqual({
      planner_scope: "test-scope",
      semester_id: plannerSemesterIds[0],
      event_id: "wevt-456",
      title: "Football Training",
      description: "Bring water bottle",
      category: "Sports",
      day: "Thu",
      start_time: "18:00",
      end_time: "19:30",
      participants: ["Maya", "Leo"],
    });

    const roundTrip = rowToPlannerWeekEvent(row);
    expect(roundTrip?.event).toEqual(originalEvent);
  });

  it("defaults unknown categories to Other to prevent data loss", () => {
    const invalidCategoryRow: SupabaseWeekEventRow = {
      planner_scope: "test-scope",
      semester_id: plannerSemesterIds[0],
      event_id: "wevt-invalid",
      title: "Bad Category",
      description: null,
      category: "InvalidCategory",
      day: "Mon",
      start_time: "08:00",
      end_time: "09:00",
      participants: [],
    };

    const parsed = rowToPlannerWeekEvent(invalidCategoryRow);
    expect(parsed).not.toBeNull();
    expect(parsed?.event.category).toBe("Other");
  });

  it("safely ignores rows with invalid days or missing times", () => {
    const invalidDayRow: SupabaseWeekEventRow = {
      planner_scope: "test-scope",
      semester_id: plannerSemesterIds[0],
      event_id: "wevt-bad-day",
      title: "Bad Day",
      description: null,
      category: "University",
      day: "InvalidDay",
      start_time: "08:00",
      end_time: "09:00",
      participants: [],
    };

    expect(rowToPlannerWeekEvent(invalidDayRow)).toBeNull();

    const missingTimeRow: SupabaseWeekEventRow = {
      planner_scope: "test-scope",
      semester_id: plannerSemesterIds[0],
      event_id: "wevt-notime",
      title: "No Time",
      description: null,
      category: "University",
      day: "Mon",
      start_time: null,
      end_time: null,
      participants: [],
    };

    expect(rowToPlannerWeekEvent(missingTimeRow)).toBeNull();
  });

  it("normalizes participants properly from messy arrays", () => {
    expect(normalizeParticipants(["  Alice  ", "", "Bob", null, 123])).toEqual([
      "Alice",
      "Bob",
    ]);
  });

  it("converts a list of rows into semester-grouped week events", () => {
    const rows: SupabaseWeekEventRow[] = [
      {
        planner_scope: "test-scope",
        semester_id: plannerSemesterIds[0],
        event_id: "wevt-group-1",
        title: "Lecture",
        description: null,
        category: "University",
        day: "Tue",
        start_time: "10:00",
        end_time: "11:30",
        participants: ["Alice"],
      },
    ];

    const result = rowsToWeekEventsBySemester(rows);
    expect(result[plannerSemesterIds[0]]).toHaveLength(1);
    expect(result[plannerSemesterIds[0]]![0].title).toBe("Lecture");
  });
});
