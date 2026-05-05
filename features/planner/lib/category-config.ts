/**
 * Calendar Event Category UI Configuration
 *
 * This module provides a single source of truth for styling calendar events
 * by category. All calendar event category colors and styles are centralized here.
 */

import type { PlannerEventCategory } from "./planner";

export type CalendarCategoryTheme = {
  badge: string;
  section: string;
  heading: string;
  accent: string;
  checkbox: string;
};

export const CALENDAR_CATEGORY_THEMES: Record<
  PlannerEventCategory,
  CalendarCategoryTheme
> = {
  Exam: {
    badge: "border-violet-200 bg-violet-50 text-violet-900",
    section: "border-violet-200 bg-violet-50/80",
    heading: "text-violet-900",
    accent: "bg-violet-500",
    checkbox: "text-violet-700",
  },
  "Language Exam": {
    badge: "border-rose-200 bg-rose-50 text-rose-900",
    section: "border-rose-200 bg-rose-50/80",
    heading: "text-rose-900",
    accent: "bg-rose-500",
    checkbox: "text-rose-700",
  },
  "Group Event": {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-900",
    section: "border-emerald-200 bg-emerald-50/80",
    heading: "text-emerald-900",
    accent: "bg-emerald-500",
    checkbox: "text-emerald-700",
  },
  "Private Event": {
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    section: "border-amber-200 bg-amber-50/80",
    heading: "text-amber-900",
    accent: "bg-amber-400",
    checkbox: "text-amber-700",
  },
  Other: {
    badge: "border-sky-200 bg-sky-50 text-sky-900",
    section: "border-sky-200 bg-sky-50/80",
    heading: "text-sky-900",
    accent: "bg-sky-500",
    checkbox: "text-sky-700",
  },
};

/**
 * Safely gets the full theme object for any calendar category, with a built-in fallback.
 */
export function getCalendarTheme(category: string): CalendarCategoryTheme {
  return (
    CALENDAR_CATEGORY_THEMES[category as PlannerEventCategory] ??
    CALENDAR_CATEGORY_THEMES["Other"]
  );
}
