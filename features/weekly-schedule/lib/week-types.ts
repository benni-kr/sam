/**
 * Weekly Schedule Domain Types, Constants, and Mock Data
 *
 * This module contains all types and constants specific to the weekly schedule feature.
 * It represents the bounded context for weekly time-blocking scheduling.
 */

export type PlannerWeekEventCategory =
  | "University"
  | "Language courses"
  | "Sports"
  | "Other";

export const plannerWeekEventCategories: PlannerWeekEventCategory[] = [
  "University",
  "Language courses",
  "Sports",
  "Other",
];

export type PlannerWeekday =
  | "Mon"
  | "Tue"
  | "Wed"
  | "Thu"
  | "Fri"
  | "Sat"
  | "Sun";

export const plannerWeekdays: PlannerWeekday[] = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

export type PlannerWeekEvent = {
  id: string;
  title: string;
  category: PlannerWeekEventCategory;
  day: PlannerWeekday;
  startTime: string;
  endTime: string;
  participants: string[];
};

export const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];
