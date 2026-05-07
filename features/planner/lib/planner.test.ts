import { describe, expect, it } from "vitest";
import {
  buildMonthDays,
  weekdayLabels,
  formatDateKey,
  monthFormatter,
} from "./planner-utils";

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
      // Depending on the environment, Intl might use non-breaking spaces
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
