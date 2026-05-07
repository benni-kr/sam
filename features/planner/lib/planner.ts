/**
 * Calendar Domain Types, Constants, and Aggregates
 *
 * This module contains types and logic specific to the calendar view and
 * the PlannerSemester aggregate root. It represents the bounded context for
 * semester-based event planning.
 */

import type { PlannerWeekEvent } from "@/features/weekly-schedule/lib/week-types";

/**
 * The fixed category set for semester-based calendar events.
 */
export type PlannerEventCategory =
  | "Exam"
  | "Language Exam"
  | "Group Event"
  | "Private Event"
  | "Other";

/**
 * The fixed set of planner categories used to classify semester events.
 */
export const plannerEventCategories: PlannerEventCategory[] = [
  "Exam",
  "Language Exam",
  "Group Event",
  "Private Event",
  "Other",
];

/**
 * A calendar event stored inside a semester plan.
 */
export type PlannerEvent = {
  /** Stable event identifier used across persistence and drag/drop actions. */
  id: string;
  /** User-facing title shown in every planner view. */
  title: string;
  /** Domain category used for filtering, theme lookup, and summaries. */
  category: PlannerEventCategory;
  /** Inclusive start date in YYYY-MM-DD format, or null when the event is in the inbox. */
  startDate: string | null;
  /** Inclusive end date in YYYY-MM-DD format, or null when the event is undated. */
  endDate: string | null;
  /** Participant names are stored as display strings and matched case-insensitively. */
  participants: string[];
};

/**
 * A month slot that belongs to one planner semester.
 */
export type PlannerMonth = {
  label: string;
  year: number;
  monthIndex: number;
};

/**
 * Stable semester identifiers used to key planner state and persistence.
 */
export type PlannerSemesterId = "spring-2026" | "fall-2026";

/**
 * A complete semester aggregate with its calendar months and event collections.
 */
export type PlannerSemester = {
  /** Stable semester identifier used as the persistence and reducer key. */
  id: PlannerSemesterId;
  /** Human-readable semester title shown in the UI. */
  label: string;
  /** Display text describing the covered date range. */
  dateRangeLabel: string;
  /** Short semester summary used in route metadata and sidebars. */
  description: string;
  /** Calendar months that belong to this semester's six-month timeline. */
  months: PlannerMonth[];
  /** Semester-scoped calendar events stored in the planner persistence layer. */
  events: PlannerEvent[];
  /** Semester-scoped weekly schedule events stored alongside the calendar data. */
  weekEvents: PlannerWeekEvent[];
};

/**
 * Named planner views exposed in the app shell navigation.
 */
export type PlannerViewKey = "calendar" | "crosstables" | "list" | "week";

/**
 * Metadata describing a navigable planner view.
 */
export type PlannerView = {
  key: PlannerViewKey;
  label: string;
  href: string;
  description: string;
};

/**
 * Aggregated summary for a category within a semester.
 */
export type PlannerCategorySummary = {
  category: PlannerEventCategory;
  count: number;
  participants: string[];
  events: PlannerEvent[];
};

export const plannerSemesterIds: PlannerSemesterId[] = [
  "spring-2026",
  "fall-2026",
];

/**
 * Initial seed state for the friends domain.
 *
 * This array is used before the user persists any custom friends to
 * Supabase, giving the app a stable starting point for planner participant
 * selection.
 */
export const SEMESTER_FRIENDS: string[] = [];

/**
 * Immutable semester template/configuration for the application's timeframes.
 *
 * The planner treats this array as the source of truth for the 6-month
 * boundaries that drive the calendar grid UI, semester switching, and
 * persistence scoping.
 */
export const plannerSemesters: PlannerSemester[] = [
  {
    id: "spring-2026",
    label: "Spring 2026",
    dateRangeLabel: "April 2026 to September 2026",
    description:
      "A collaborative semester workspace for exams, trips, and shared plans.",
    months: [
      { label: "April", year: 2026, monthIndex: 3 },
      { label: "May", year: 2026, monthIndex: 4 },
      { label: "June", year: 2026, monthIndex: 5 },
      { label: "July", year: 2026, monthIndex: 6 },
      { label: "August", year: 2026, monthIndex: 7 },
      { label: "September", year: 2026, monthIndex: 8 },
    ],
    events: [],
    weekEvents: [],
  },
  {
    id: "fall-2026",
    label: "Fall 2026",
    dateRangeLabel: "October 2026 to March 2027",
    description:
      "A second semester calendar so the planner can switch between terms without changing the UI.",
    months: [
      { label: "October", year: 2026, monthIndex: 9 },
      { label: "November", year: 2026, monthIndex: 10 },
      { label: "December", year: 2026, monthIndex: 11 },
      { label: "January", year: 2027, monthIndex: 0 },
      { label: "February", year: 2027, monthIndex: 1 },
      { label: "March", year: 2027, monthIndex: 2 },
    ],
    events: [],
    weekEvents: [],
  },
];

export const plannerSemester: PlannerSemester = plannerSemesters[0];

export const defaultPlannerSemesterId: PlannerSemesterId = plannerSemester.id;

export const plannerViews: PlannerView[] = [
  {
    key: "calendar",
    label: "Calendar",
    href: "/",
    description: "6-month overview with inbox",
  },
  {
    key: "crosstables",
    label: "Table",
    href: "/crosstables",
    description: "Who's in cross table",
  },
  {
    key: "list",
    label: "List",
    href: "/list",
    description: "Compact schedule feed",
  },
  {
    key: "week",
    label: "Week",
    href: "/week",
    description: "Monday-to-Sunday weekly timetable",
  },
];

/**
 * Resolves a semester by id, falling back to the default semester when the
 * requested id is missing or unknown.
 */
export function getPlannerSemester(
  semesterId: string | null | undefined = defaultPlannerSemesterId,
): PlannerSemester {
  return (
    plannerSemesters.find((semester) => semester.id === semesterId) ??
    plannerSemester
  );
}

/**
 * Returns the events that begin on a specific calendar date.
 */
export function getEventsForDate(
  dateKey: string,
  semesterId: string | null | undefined = defaultPlannerSemesterId,
) {
  return getPlannerSemester(semesterId).events.filter(
    (event) => event.startDate === dateKey,
  );
}

/**
 * Returns the undated events that still live in a semester inbox.
 */
export function getInboxEvents(
  semesterId: string | null | undefined = defaultPlannerSemesterId,
) {
  return getPlannerSemester(semesterId).events.filter(
    (event) => !event.startDate,
  );
}

/**
 * Builds per-category counts, participants, and event lists for one semester.
 */
export function getCategorySummaries(
  semesterId: string | null | undefined = defaultPlannerSemesterId,
): PlannerCategorySummary[] {
  const semester = getPlannerSemester(semesterId);
  const categories = new Set<PlannerEventCategory>();

  for (const event of semester.events) {
    categories.add(event.category);
  }

  return Array.from(categories).map((category) => {
    const events = semester.events.filter(
      (event) => event.category === category,
    );
    const participants = Array.from(
      new Set(events.flatMap((event) => event.participants)),
    );

    return {
      category,
      count: events.length,
      participants,
      events,
    };
  });
}

/**
 * Returns semester events sorted by schedule date and title for list views.
 */
export function getChronologicalEvents(
  semesterId: string | null | undefined = defaultPlannerSemesterId,
): PlannerEvent[] {
  const semester = getPlannerSemester(semesterId);

  return [...semester.events].sort((left, right) => {
    // Push undated Inbox events to the bottom so officially scheduled events
    // remain prioritized at the top of chronological feeds.
    if (left.startDate === null && right.startDate === null) {
      return left.title.localeCompare(right.title);
    }

    if (left.startDate === null) {
      return 1;
    }

    if (right.startDate === null) {
      return -1;
    }

    const dateComparison = left.startDate.localeCompare(right.startDate);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    if (left.endDate === null && right.endDate === null) {
      return left.title.localeCompare(right.title);
    }

    if (left.endDate === null) {
      return 1;
    }

    if (right.endDate === null) {
      return -1;
    }

    const endDateComparison = left.endDate.localeCompare(right.endDate);

    if (endDateComparison !== 0) {
      return endDateComparison;
    }

    return left.title.localeCompare(right.title);
  });
}

/**
 * Returns the months that make up the active semester timeline.
 */
export function getSemesterMonths(
  semesterId: string | null | undefined = defaultPlannerSemesterId,
): PlannerMonth[] {
  return getPlannerSemester(semesterId).months;
}
