/**
 * Planner Utility Functions
 *
 * This module contains generic, domain-agnostic utility functions used across
 * the planner feature for date formatting and calendar calculations.
 */

/**
 * Formats a Date into a YYYY-MM-DD key used across planner state and persistence.
 */
export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Builds a month grid as week rows with Monday as the first day.
 * Empty leading/trailing cells are represented by null.
 */
export function buildMonthDays(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  const cells: Array<number | null> = Array.from(
    { length: leadingEmptyDays },
    () => null,
  );

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];
