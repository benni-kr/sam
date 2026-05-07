/**
 * Weekly Schedule Domain Types and Constants
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
  /** Stable event identifier shared with persistence and UI drag handles. */
  id: string;
  /** User-facing title displayed inside the weekly timetable block. */
  title: string;
  /** Weekly routine category used for theme lookup and filtering. */
  category: PlannerWeekEventCategory;
  /** Weekday key that determines the event's column in the weekly grid. */
  day: PlannerWeekday;
  /** Start time in 24-hour HH:MM format used by the time grid. */
  startTime: string;
  /** End time in 24-hour HH:MM format used by the time grid. */
  endTime: string;
  /** Participant names are stored as display strings and matched case-insensitively. */
  participants: string[];
};

/**
 * Single-letter labels used in compact weekly calendar headers.
 */
export const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];
