/**
 * Weekly Schedule Event Category UI Configuration
 *
 * This module provides a single source of truth for styling weekly schedule events
 * by category. All weekly event category colors and styles are centralized here.
 */

import type { PlannerWeekEventCategory } from "./week-types";

export type WeekCategoryTheme = {
  card: string;
  accent: string;
};

export const WEEK_CATEGORY_THEMES: Record<
  PlannerWeekEventCategory,
  WeekCategoryTheme
> = {
  University: {
    card: "border-slate-300 bg-slate-100 text-slate-950",
    accent: "bg-slate-500",
  },
  "Language courses": {
    card: "border-emerald-500 bg-emerald-100 text-emerald-950",
    accent: "bg-emerald-500",
  },
  Sports: {
    card: "border-orange-300 bg-orange-100 text-orange-950",
    accent: "bg-orange-500",
  },
  Other: {
    card: "border-sky-300 bg-sky-100 text-sky-900",
    accent: "bg-sky-500",
  },
};

/**
 * Safely gets the full theme object for any weekly event category, with a built-in fallback.
 */
export function getWeekTheme(category: string): WeekCategoryTheme {
  return (
    WEEK_CATEGORY_THEMES[category as PlannerWeekEventCategory] ??
    WEEK_CATEGORY_THEMES["Other"]
  );
}
