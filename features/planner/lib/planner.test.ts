import { describe, expect, it } from "vitest";

import {
  buildMonthDays,
  weekdayLabels,
} from "./planner";

describe("buildMonthDays", () => {
  it("pads leading days for Monday-first calendars", () => {
    const cells = buildMonthDays(2026, 3); // April 2026

    expect(cells.slice(0, 2)).toEqual([null, null]);
    expect(cells[2]).toBe(1);
  });

  it("does not pad when month starts on Monday", () => {
    const cells = buildMonthDays(2026, 5); // June 2026

    expect(cells[0]).toBe(1);
  });

  it("always returns full week rows", () => {
    const cells = buildMonthDays(2026, 3);

    expect(cells.length % 7).toBe(0);
  });
});

describe("weekdayLabels", () => {
  it("starts with Monday", () => {
    expect(weekdayLabels).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
  });
});