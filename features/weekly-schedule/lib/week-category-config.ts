/**
 * Weekly Category Theme Tokens
 *
 * This module centralizes the visual tokens for weekly schedule categories so
 * the timetable, legends, and previews stay visually aligned.
 */

import type { PlannerWeekEventCategory } from "./week-types";

/**
 * Defines UI tokens for weekly schedule event blocks.
 */
export type WeekCategoryTheme = {
  /** Applied to the absolute-positioned event buttons in the Week View grid. */
  card: string;
  /** Used for solid color indicators, such as legend dots or sidebar highlights. */
  accent: string;
};

/**
 * Centralized theme configuration for repeating weekly routines.
 */
export const WEEK_CATEGORY_THEMES: Record<
  PlannerWeekEventCategory,
  WeekCategoryTheme
> = {
  University: {
    card: "border-slate-300 bg-slate-100 text-slate-950 dark:border-slate-400 dark:bg-slate-700 dark:text-slate-100",
    accent: "bg-slate-500",
  },
  "Language courses": {
    card: "border-emerald-500 bg-emerald-100 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-800/80 dark:text-emerald-100",
    accent: "bg-emerald-500",
  },
  Sports: {
    card: "border-orange-300 bg-orange-100 text-orange-950 dark:border-orange-400 dark:bg-orange-800/80 dark:text-orange-100",
    accent: "bg-orange-500",
  },
  Other: {
    card: "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-400 dark:bg-sky-800/80 dark:text-sky-100",
    accent: "bg-sky-500",
  },
};

/**
 * Returns the theme object for a given weekly category with a fallback to "Other".
 */
export function getWeekTheme(category: string): WeekCategoryTheme {
  return (
    WEEK_CATEGORY_THEMES[category as PlannerWeekEventCategory] ??
    WEEK_CATEGORY_THEMES["Other"]
  );
}
