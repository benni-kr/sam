/**
 * Central configuration for Calendar event UI tokens.
 *
 * This module keeps the visual language for planner categories in one place
 * so all chronological views (calendar grid, schedule feed, sidebar, and
 * related previews) stay visually consistent as the UI evolves.
 */

import type { PlannerEventCategory } from "./planner";

/**
 * Defines UI tokens for each event category across various views.
 */
export type CalendarCategoryTheme = {
  /** Applied to event pills in the Calendar, Schedule Feed, and Sidebar. */
  badge: string;
  /** Background container for category-specific sections in Crosstables. */
  section: string;
  /** Text color for category headers and event titles in list/table views. */
  heading: string;
  /** Primary brand color for vertical status bars and legend indicators. */
  accent: string;
  /** Checkmark color for the participation matrix in the Crosstables view. */
  checkbox: string;
};

/**
 * Centralized theme configuration.
 * Tones use 300-weight borders and 100-weight backgrounds to match
 * the original high-contrast overlay style.
 */
export const CALENDAR_CATEGORY_THEMES: Record<
  PlannerEventCategory,
  CalendarCategoryTheme
> = {
  Exam: {
    badge:
      "border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-400/60 dark:bg-[#432C6A] dark:text-violet-100",
    section:
      "border-violet-200 bg-violet-50/80 dark:border-violet-400/30 dark:bg-[#2C1D45]",
    heading: "text-violet-900 dark:text-violet-100",
    accent: "bg-violet-500",
    checkbox: "text-violet-700 dark:text-violet-300",
  },
  "Language Exam": {
    badge:
      "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-400/60 dark:bg-[#63283B] dark:text-rose-100",
    section:
      "border-rose-200 bg-rose-50/80 dark:border-rose-400/30 dark:bg-[#421A27]",
    heading: "text-rose-900 dark:text-rose-100",
    accent: "bg-rose-500",
    checkbox: "text-rose-700 dark:text-rose-300",
  },
  "Group Event": {
    badge:
      "border-emerald-500 bg-emerald-100 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-800 dark:text-emerald-100",
    section:
      "border-emerald-200 bg-emerald-50/80 dark:border-emerald-400/30 dark:bg-[#153625]",
    heading: "text-emerald-900 dark:text-emerald-100",
    accent: "bg-emerald-500",
    checkbox: "text-emerald-700 dark:text-emerald-300",
  },
  "Private Event": {
    badge:
      "border-amber-300 bg-[#fcf5d2] text-amber-900 dark:border-amber-400/60 dark:bg-[#663C22] dark:text-amber-100",
    section:
      "border-amber-200 bg-amber-50/80 dark:border-amber-400/30 dark:bg-[#452816]",
    heading: "text-amber-900 dark:text-amber-100",
    accent: "bg-amber-400",
    checkbox: "text-amber-700 dark:text-amber-300",
  },
  Other: {
    badge:
      "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-400/60 dark:bg-[#244B6E] dark:text-sky-100",
    section:
      "border-sky-200 bg-sky-50/80 dark:border-sky-400/30 dark:bg-[#18324A]",
    heading: "text-sky-900 dark:text-sky-100",
    accent: "bg-sky-500",
    checkbox: "text-sky-700 dark:text-sky-300",
  },
};

/**
 * Returns the theme object for a given category with a fallback to "Other".
 */
export function getCalendarTheme(category: string): CalendarCategoryTheme {
  return (
    CALENDAR_CATEGORY_THEMES[category as PlannerEventCategory] ??
    CALENDAR_CATEGORY_THEMES["Other"]
  );
}
