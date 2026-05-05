/**
 * Weekly Schedule Event Category UI Configuration
 *
 * This module provides a single source of truth for styling weekly schedule events
 * by category. All weekly event category colors and styles are centralized here.
 */

import type { PlannerWeekEventCategory } from "./week-types";

/**
 * Card styles for weekly schedule events
 * Used by: week-view, event-preview
 */
export const weekEventCardStyles: Record<
  PlannerWeekEventCategory,
  { card: string }
> = {
  University: {
    card: "border-slate-300 bg-slate-100 text-slate-950",
  },
  "Language courses": {
    card: "border-emerald-500 bg-emerald-100 text-emerald-950",
  },
  Sports: {
    card: "border-orange-300 bg-orange-100 text-orange-950",
  },
  Other: {
    card: "border-sky-300 bg-sky-100 text-sky-900",
  },
};

/**
 * Get the card style for a weekly schedule event category
 */
export function getWeekEventCardStyle(category: string): string {
  return (
    weekEventCardStyles[category as PlannerWeekEventCategory]?.card ??
    weekEventCardStyles["Other"].card
  );
}
