/**
 * Calendar Event Category UI Configuration
 *
 * This module provides a single source of truth for styling calendar events
 * by category. All calendar event category colors and styles are centralized here.
 */

import type { PlannerEventCategory } from "./planner";

/**
 * Badge tone styles for calendar events (compact representation)
 * Used by: event-badge, draggable-event, event-preview
 */
export const calendarEventBadgeStyles: Record<
  PlannerEventCategory,
  { badge: string }
> = {
  Exam: {
    badge: "border-violet-200 bg-violet-50 text-violet-900",
  },
  "Language Exam": {
    badge: "border-rose-200 bg-rose-50 text-rose-900",
  },
  "Group Event": {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  "Private Event": {
    badge: "border-amber-200 bg-amber-50 text-amber-900",
  },
  Other: {
    badge: "border-sky-200 bg-sky-50 text-sky-900",
  },
};

/**
 * Section styles for calendar events (cross-tables view)
 * Used by: crosstables-view, event-preview
 */
export const calendarEventSectionStyles: Record<
  PlannerEventCategory,
  { section: string; heading: string; accent: string }
> = {
  Exam: {
    section: "border-violet-200 bg-violet-50/80",
    heading: "text-violet-900",
    accent: "bg-violet-500",
  },
  "Language Exam": {
    section: "border-rose-200 bg-rose-50/80",
    heading: "text-rose-900",
    accent: "bg-rose-500",
  },
  "Group Event": {
    section: "border-emerald-200 bg-emerald-50/80",
    heading: "text-emerald-900",
    accent: "bg-emerald-500",
  },
  "Private Event": {
    section: "border-amber-200 bg-amber-50/80",
    heading: "text-amber-900",
    accent: "bg-amber-400",
  },
  Other: {
    section: "border-sky-200 bg-sky-50/80",
    heading: "text-sky-900",
    accent: "bg-sky-500",
  },
};

/**
 * Checkbox mark styles for calendar events (cross-tables view)
 * Used by: crosstables-view
 */
export const calendarEventCheckboxStyles: Record<
  PlannerEventCategory,
  { mark: string }
> = {
  Exam: {
    mark: "text-violet-700",
  },
  "Language Exam": {
    mark: "text-rose-700",
  },
  "Group Event": {
    mark: "text-emerald-700",
  },
  "Private Event": {
    mark: "text-amber-700",
  },
  Other: {
    mark: "text-sky-700",
  },
};

/**
 * Get the badge style for a calendar event category
 */
export function getCalendarEventBadgeStyle(category: string): string {
  return (
    calendarEventBadgeStyles[category as PlannerEventCategory]?.badge ??
    calendarEventBadgeStyles["Other"].badge
  );
}

/**
 * Get the section style for a calendar event category
 */
export function getCalendarEventSectionStyle(
  category: string,
): Record<string, string> {
  return (
    calendarEventSectionStyles[category as PlannerEventCategory] ??
    calendarEventSectionStyles["Other"]
  );
}

/**
 * Get the checkbox mark style for a calendar event category
 */
export function getCalendarEventCheckboxStyle(category: string): string {
  return (
    calendarEventCheckboxStyles[category as PlannerEventCategory]?.mark ??
    calendarEventCheckboxStyles["Other"].mark
  );
}

/**
 * Get the accent color (primary highlight) for a calendar event category
 * Used for legend indicators and highlights
 */
export function getCalendarEventAccentColor(category: string): string {
  const styles = getCalendarEventSectionStyle(category);
  return styles.accent;
}
