import { describe, expect, it } from "vitest";
import {
  buildMonthDays,
  weekdayLabels,
  formatDateKey,
  monthFormatter,
} from "./planner-utils";
import {
  MIN_PLANNER_DATE,
  ORIGIN_SEMESTER_ID,
  buildSemester,
  clampToMinDate,
  compareSemesterIds,
  eventOverlapsSemester,
  getAvailableSemesters,
  getCurrentSemesterId,
  getNextSemesterId,
  getPlannerSemester,
  getPreviousSemesterId,
  getSemesterDateRange,
  getSemesterIdForDate,
  normalizeDateRange,
  parseSemesterId,
  defaultPlannerSemesterId,
  type PlannerEvent,
} from "./planner";

describe("planner-utils", () => {
  describe("formatDateKey", () => {
    it("formats dates as YYYY-MM-DD with leading zeros", () => {
      const date = new Date(2026, 4, 7); // May 7, 2026
      expect(formatDateKey(date)).toBe("2026-05-07");
    });

    it("handles double-digit months and days correctly", () => {
      const date = new Date(2026, 11, 25); // Dec 25, 2026
      expect(formatDateKey(date)).toBe("2026-12-25");
    });
  });

  describe("buildMonthDays", () => {
    it("pads leading days for Monday-first calendars (April 2026)", () => {
      // April 1, 2026 is a Wednesday.
      // Monday (null), Tuesday (null), Wednesday (1)
      const cells = buildMonthDays(2026, 3);

      expect(cells.slice(0, 2)).toEqual([null, null]);
      expect(cells[2]).toBe(1);
    });

    it("does not pad when the month starts on Monday (June 2026)", () => {
      const cells = buildMonthDays(2026, 5);
      expect(cells[0]).toBe(1);
    });

    it("handles February in a leap year (2024)", () => {
      const cells = buildMonthDays(2024, 1);
      const daysOnly = cells.filter((c): c is number => c !== null);

      expect(daysOnly).toContain(29);
      expect(daysOnly.length).toBe(29);
    });

    it("always returns full week rows (multiple of 7)", () => {
      const cells = buildMonthDays(2026, 4); // May 2026
      expect(cells.length % 7).toBe(0);
    });

    it("pads trailing days with null at the end of the grid", () => {
      const cells = buildMonthDays(2026, 3); // April 2026
      expect(cells[cells.length - 1]).toBeNull();
    });
  });

  describe("monthFormatter", () => {
    it("returns the full English month and year", () => {
      const date = new Date(2026, 4, 1);
      const result = monthFormatter.format(date).replace(/\u00a0/g, " ");
      expect(result).toBe("May 2026");
    });
  });

  describe("weekdayLabels", () => {
    it("starts with Monday and ends with Sunday", () => {
      expect(weekdayLabels).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
    });
  });
});

describe("Dynamic Semester Generator & Calculators", () => {
  describe("parseSemesterId", () => {
    it("correctly parses valid spring and fall semester IDs", () => {
      expect(parseSemesterId("spring-2026")).toEqual({ term: "spring", year: 2026 });
      expect(parseSemesterId("fall-2027")).toEqual({ term: "fall", year: 2027 });
    });

    it("returns null for malformed or missing strings", () => {
      expect(parseSemesterId("summer-2026")).toBeNull();
      expect(parseSemesterId("random-text")).toBeNull();
      expect(parseSemesterId(null)).toBeNull();
      expect(parseSemesterId("")).toBeNull();
    });
  });

  describe("buildSemester", () => {
    it("constructs Spring semester with months April to September", () => {
      const sem = buildSemester("spring", 2026);
      expect(sem.id).toBe("spring-2026");
      expect(sem.label).toBe("Spring 2026");
      expect(sem.dateRangeLabel).toBe("April 2026 to September 2026");
      expect(sem.months).toHaveLength(6);
      expect(sem.months[0]).toEqual({ label: "April", year: 2026, monthIndex: 3 });
      expect(sem.months[5]).toEqual({ label: "September", year: 2026, monthIndex: 8 });
    });

    it("constructs Fall semester with months October to March spanning year boundary", () => {
      const sem = buildSemester("fall", 2026);
      expect(sem.id).toBe("fall-2026");
      expect(sem.label).toBe("Fall 2026");
      expect(sem.dateRangeLabel).toBe("October 2026 to March 2027");
      expect(sem.months).toHaveLength(6);
      expect(sem.months[0]).toEqual({ label: "October", year: 2026, monthIndex: 9 });
      expect(sem.months[2]).toEqual({ label: "December", year: 2026, monthIndex: 11 });
      expect(sem.months[3]).toEqual({ label: "January", year: 2027, monthIndex: 0 });
      expect(sem.months[5]).toEqual({ label: "March", year: 2027, monthIndex: 2 });
    });
  });

  describe("getSemesterDateRange", () => {
    it("returns accurate inclusive date bounds for Spring", () => {
      const sem = buildSemester("spring", 2026);
      expect(getSemesterDateRange(sem)).toEqual({
        startDate: "2026-04-01",
        endDate: "2026-09-30",
      });
    });

    it("returns accurate inclusive date bounds for Fall", () => {
      const sem = buildSemester("fall", 2026);
      expect(getSemesterDateRange(sem)).toEqual({
        startDate: "2026-10-01",
        endDate: "2027-03-31",
      });
    });
  });

  describe("getSemesterIdForDate", () => {
    it("maps dates in April-September to spring semester of that year", () => {
      expect(getSemesterIdForDate("2026-04-01")).toBe("spring-2026");
      expect(getSemesterIdForDate("2026-07-15")).toBe("spring-2026");
      expect(getSemesterIdForDate("2026-09-30")).toBe("spring-2026");
      expect(getSemesterIdForDate("2027-05-10")).toBe("spring-2027");
    });

    it("maps dates in October-December to fall semester of that year", () => {
      expect(getSemesterIdForDate("2026-10-01")).toBe("fall-2026");
      expect(getSemesterIdForDate("2026-12-31")).toBe("fall-2026");
      expect(getSemesterIdForDate("2027-11-20")).toBe("fall-2027");
    });

    it("maps dates in January-March to fall semester of the PREVIOUS year", () => {
      expect(getSemesterIdForDate("2027-01-01")).toBe("fall-2026");
      expect(getSemesterIdForDate("2027-02-14")).toBe("fall-2026");
      expect(getSemesterIdForDate("2027-03-31")).toBe("fall-2026");
      expect(getSemesterIdForDate("2028-02-01")).toBe("fall-2027");
    });

    it("falls back to default semester for invalid or null dates", () => {
      expect(getSemesterIdForDate(null)).toBe(defaultPlannerSemesterId);
      expect(getSemesterIdForDate("")).toBe(defaultPlannerSemesterId);
      expect(getSemesterIdForDate("invalid")).toBe(defaultPlannerSemesterId);
    });
  });

  describe("eventOverlapsSemester (Cross-Semester & Border Support)", () => {
    const spring2026 = buildSemester("spring", 2026);
    const fall2026 = buildSemester("fall", 2026);

    const makeEvent = (startDate: string | null, endDate: string | null): PlannerEvent => ({
      id: "test",
      title: "Test",
      category: "Exam",
      startDate,
      endDate,
      participants: [],
    });

    it("returns true when event is strictly inside semester", () => {
      expect(eventOverlapsSemester(makeEvent("2026-05-01", "2026-05-03"), spring2026)).toBe(true);
      expect(eventOverlapsSemester(makeEvent("2026-05-01", "2026-05-03"), fall2026)).toBe(false);
    });

    it("handles cross-semester events overlapping BOTH adjacent semesters", () => {
      // Sep 28 to Oct 4 crosses from Spring 2026 into Fall 2026
      const crossBorderEvent = makeEvent("2026-09-28", "2026-10-04");
      expect(eventOverlapsSemester(crossBorderEvent, spring2026)).toBe(true);
      expect(eventOverlapsSemester(crossBorderEvent, fall2026)).toBe(true);
    });

    it("returns false for events outside the semester date range", () => {
      expect(eventOverlapsSemester(makeEvent("2026-11-01", "2026-11-05"), spring2026)).toBe(false);
      expect(eventOverlapsSemester(makeEvent("2026-04-10", "2026-04-12"), fall2026)).toBe(false);
    });

    it("returns false for undated inbox events", () => {
      expect(eventOverlapsSemester(makeEvent(null, null), spring2026)).toBe(false);
      expect(eventOverlapsSemester(makeEvent(null, null), fall2026)).toBe(false);
    });
  });

  describe("Date Clamping (min date 2026-04-01)", () => {
    it("clampToMinDate clamps dates earlier than 2026-04-01", () => {
      expect(clampToMinDate("2025-12-15")).toBe(MIN_PLANNER_DATE);
      expect(clampToMinDate("2026-03-31")).toBe(MIN_PLANNER_DATE);
      expect(clampToMinDate("2026-04-01")).toBe("2026-04-01");
      expect(clampToMinDate("2026-05-10")).toBe("2026-05-10");
      expect(clampToMinDate(null)).toBeNull();
    });

    it("normalizeDateRange clamps start and end dates and ensures end >= start", () => {
      const result = normalizeDateRange("2025-11-01", "2025-11-10");
      expect(result.startDate).toBe("2026-04-01");
      expect(result.endDate).toBe("2026-04-01");

      const validResult = normalizeDateRange("2026-05-01", "2026-05-10");
      expect(validResult.startDate).toBe("2026-05-01");
      expect(validResult.endDate).toBe("2026-05-10");
    });
  });

  describe("getNextSemesterId and getPreviousSemesterId", () => {
    it("advances and decrements semesters sequentially", () => {
      expect(getNextSemesterId("spring-2026")).toBe("fall-2026");
      expect(getNextSemesterId("fall-2026")).toBe("spring-2027");
      expect(getNextSemesterId("spring-2027")).toBe("fall-2027");

      expect(getPreviousSemesterId("fall-2027")).toBe("spring-2027");
      expect(getPreviousSemesterId("spring-2027")).toBe("fall-2026");
      expect(getPreviousSemesterId("fall-2026")).toBe("spring-2026");
    });
  });

  describe("compareSemesterIds", () => {
    it("chronologically orders semesters correctly", () => {
      expect(compareSemesterIds("spring-2026", "fall-2026")).toBeLessThan(0);
      expect(compareSemesterIds("fall-2026", "spring-2027")).toBeLessThan(0);
      expect(compareSemesterIds("spring-2027", "spring-2027")).toBe(0);
      expect(compareSemesterIds("fall-2026", "spring-2026")).toBeGreaterThan(0);
    });
  });

  describe("getCurrentSemesterId & ORIGIN_SEMESTER_ID", () => {
    it("has Spring 2026 as the origin semester ID", () => {
      expect(ORIGIN_SEMESTER_ID).toBe("spring-2026");
    });

    it("evaluates current semester based on reference date", () => {
      expect(getCurrentSemesterId(new Date(2026, 3, 10))).toBe("spring-2026");
      expect(getCurrentSemesterId(new Date(2026, 9, 20))).toBe("fall-2026");
      expect(getCurrentSemesterId(new Date(2027, 1, 1))).toBe("fall-2026");
      expect(getCurrentSemesterId(new Date(2027, 4, 1))).toBe("spring-2027");
    });
  });

  describe("getAvailableSemesters", () => {
    it("starts at Spring 2026 and includes current plus one future semester by default", () => {
      // Mock reference date: October 2026 => current is fall-2026, future is spring-2027
      const refDate = new Date(2026, 9, 15); // Oct 15, 2026
      const sems = getAvailableSemesters([], refDate);

      expect(sems.map((s) => s.id)).toEqual([
        "spring-2026",
        "fall-2026",
        "spring-2027",
      ]);
    });

    it("automatically expands if an event exists in a further future semester", () => {
      const refDate = new Date(2026, 9, 15); // Oct 15, 2026
      const futureEvent: PlannerEvent = {
        id: "evt-far",
        title: "Far future",
        category: "Exam",
        startDate: "2027-11-15", // In fall-2027 (which is beyond spring-2027)
        endDate: "2027-11-15",
        participants: [],
      };

      const sems = getAvailableSemesters([futureEvent], refDate);
      expect(sems.map((s) => s.id)).toEqual([
        "spring-2026",
        "fall-2026",
        "spring-2027",
        "fall-2027",
      ]);
    });
  });

  describe("getPlannerSemester", () => {
    it("dynamically generates requested semester if valid", () => {
      const sem = getPlannerSemester("spring-2028");
      expect(sem.id).toBe("spring-2028");
      expect(sem.label).toBe("Spring 2028");
    });

    it("falls back to current semester for null or invalid id", () => {
      const sem = getPlannerSemester(null);
      expect(sem.id).toBe(defaultPlannerSemesterId);
    });
  });
});
