/**
 * Weekly Schedule Domain Types, Constants, and Mock Data
 *
 * This module contains all types and constants specific to the weekly schedule feature.
 * It represents the bounded context for weekly time-blocking scheduling.
 */

/**
 * The fixed category set for repeating weekly schedule events.
 */
export type PlannerWeekEventCategory =
  | "University"
  | "Language courses"
  | "Sports"
  | "Other";

/**
 * The fixed category set for weekly schedule events.
 */
export const plannerWeekEventCategories: PlannerWeekEventCategory[] = [
  "University",
  "Language courses",
  "Sports",
  "Other",
];

/**
 * Short weekday identifiers used by the weekly timetable view.
 */
export type PlannerWeekday =
  | "Mon"
  | "Tue"
  | "Wed"
  | "Thu"
  | "Fri"
  | "Sat"
  | "Sun";

/**
 * The ordered weekday labels used when rendering the weekly grid.
 */
export const plannerWeekdays: PlannerWeekday[] = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

/**
 * A repeating weekly schedule event stored in the weekly schedule domain.
 */
export type PlannerWeekEvent = {
  id: string;
  title: string;
  category: PlannerWeekEventCategory;
  day: PlannerWeekday;
  startTime: string;
  endTime: string;
  participants: string[];
};

/**
 * Single-letter labels used in compact weekly calendar headers.
 */
export const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];
