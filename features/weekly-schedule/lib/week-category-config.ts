/**
 * Weekly Category Theme Tokens
 *
 * This module centralizes the visual tokens for weekly schedule categories so
 * the timetable, legends, and previews stay visually aligned.
 */

import type {
  BackgroundIconKind,
  PlannerWeekEventCategory,
} from "./week-types";

export type { BackgroundIconKind };

/**
 * Defines UI tokens for weekly schedule event blocks.
 */
export type WeekCategoryTheme = {
  /** Applied to the absolute-positioned event buttons in the Week View grid. */
  card: string;
  /** Used for solid color indicators, such as legend dots or sidebar highlights. */
  accent: string;
  /** Used for section headers or text labels (like descriptions). */
  heading: string;
};

/**
 * Centralized theme configuration for repeating weekly routines.
 */
export const WEEK_CATEGORY_THEMES: Record<
  PlannerWeekEventCategory,
  WeekCategoryTheme
> = {
  University: {
    card: "border-slate-300 bg-slate-100/85 text-slate-950 dark:border-slate-400/60 dark:bg-[#334155]/85 dark:text-slate-100",
    accent: "bg-slate-500",
    heading: "text-slate-700 dark:text-slate-300",
  },
  "Language courses": {
    card: "border-emerald-500 bg-emerald-100/85 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-800/85 dark:text-emerald-100",
    accent: "bg-emerald-500",
    heading: "text-emerald-700 dark:text-emerald-300",
  },
  Sports: {
    card: "border-orange-300 bg-orange-100/85 text-orange-950 dark:border-orange-400/60 dark:bg-[#663C22]/85 dark:text-orange-100",
    accent: "bg-orange-500",
    heading: "text-orange-700 dark:text-orange-300",
  },
  Other: {
    card: "border-sky-300 bg-sky-100/85 text-sky-900 dark:border-sky-400/60 dark:bg-[#244B6E]/85 dark:text-sky-100",
    accent: "bg-sky-500",
    heading: "text-sky-700 dark:text-sky-300",
  },
  Background: {
    card: "border-amber-300/70 bg-week-hatch text-amber-950 dark:border-amber-400/30 dark:text-amber-100",
    accent: "bg-amber-400/80 border border-dashed border-amber-600/60",
    heading: "text-amber-700 dark:text-amber-300",
  },
};

export const BACKGROUND_ICON_OPTIONS: ReadonlyArray<{
  kind: BackgroundIconKind;
  label: string;
}> = [
  { kind: "lunch", label: "Lunch / Food" },
  { kind: "coffee", label: "Coffee / Break" },
  { kind: "study", label: "Study / Focus" },
  { kind: "workout", label: "Workout / Gym" },
  { kind: "commute", label: "Commute / Travel" },
  { kind: "rest", label: "Rest / Quiet" },
];

export function isBackgroundIconKind(
  value: unknown,
): value is BackgroundIconKind {
  return (
    typeof value === "string" &&
    BACKGROUND_ICON_OPTIONS.some((option) => option.kind === value)
  );
}

/**
 * Picks a watermark icon kind for a background activity, honoring any explicit
 * selection first and otherwise inferring from the title (defaulting to "lunch").
 */
export function getBackgroundIconKind(
  title: string,
  explicitIcon?: BackgroundIconKind,
): BackgroundIconKind {
  if (explicitIcon && isBackgroundIconKind(explicitIcon)) {
    return explicitIcon;
  }

  const lower = title.trim().toLocaleLowerCase();

  if (/(coffee|caf[eé]|tea|break|pause|breakfast)/.test(lower)) {
    return "coffee";
  }
  if (/(study|focus|learn|read|homework|library)/.test(lower)) {
    return "study";
  }
  if (/(gym|workout|sport|fitness|run|training|yoga)/.test(lower)) {
    return "workout";
  }
  if (/(commute|train|bus|transit|travel|bike|drive)/.test(lower)) {
    return "commute";
  }
  if (/(sleep|rest|nap|quiet|chill|free)/.test(lower)) {
    return "rest";
  }

  return "lunch";
}

/**
 * Returns the theme object for a given weekly category with a fallback to "Other".
 */
export function getWeekTheme(category: string): WeekCategoryTheme {
  return (
    WEEK_CATEGORY_THEMES[category as PlannerWeekEventCategory] ??
    WEEK_CATEGORY_THEMES["Other"]
  );
}
