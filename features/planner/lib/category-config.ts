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
    badge: "border-violet-300 bg-violet-100 text-violet-900",
    section: "border-violet-200 bg-violet-50/80",
    heading: "text-violet-900",
    accent: "bg-violet-500",
    checkbox: "text-violet-700",
  },
  "Language Exam": {
    badge: "border-rose-200 bg-rose-50 text-rose-900",
    section: "border-rose-100 bg-rose-50/80",
    heading: "text-rose-900",
    accent: "bg-rose-500",
    checkbox: "text-rose-700",
  },
  "Group Event": {
    badge: "border-emerald-300 bg-emerald-100 text-emerald-900",
    section: "border-emerald-200 bg-emerald-50/80",
    heading: "text-emerald-900",
    accent: "bg-emerald-500",
    checkbox: "text-emerald-700",
  },
  "Private Event": {
    badge: "border-amber-300 bg-[#fcf5d2] text-amber-900",
    section: "border-amber-200 bg-amber-50/80",
    heading: "text-amber-900",
    accent: "bg-amber-400",
    checkbox: "text-amber-700",
  },
  Other: {
    badge: "border-sky-300 bg-sky-100 text-sky-900",
    section: "border-sky-200 bg-sky-50/80",
    heading: "text-sky-900",
    accent: "bg-sky-500",
    checkbox: "text-sky-700",
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
