/**
 * Weekly Schedule Event Category UI Configuration
 *
 * This module provides a single source of truth for styling weekly schedule events
 * by category. All weekly event category colors and styles are centralized here.
 */

import type { PlannerWeekEventCategory } from "./week-types";

export type { PlannerWeekEventCategory };

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
 * Accent colors for weekly schedule events
 * Used for legend indicators and highlights
 */
export const weekEventAccentColors: Record<PlannerWeekEventCategory, string> = {
  University: "bg-slate-500",
  "Language courses": "bg-emerald-500",
  Sports: "bg-orange-500",
  Other: "bg-sky-500",
};

/**
 * Get the card style for a weekly schedule event category
 */
export function getWeekEventCardStyle(
  category: PlannerWeekEventCategory,
): string {
  return (
    weekEventCardStyles[category]?.card ?? weekEventCardStyles["Other"].card
  );
}

/**
 * Get the accent color (primary highlight) for a weekly schedule event category
 * Used for legend indicators and highlights
 */
export function getWeekEventAccentColor(
  category: PlannerWeekEventCategory,
): string {
  return weekEventAccentColors[category] ?? weekEventAccentColors["Other"];
}
