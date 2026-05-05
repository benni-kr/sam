/**
 * Calendar Domain Types, Constants, and Aggregates
 *
 * This module contains types and logic specific to the calendar view and
 * the PlannerSemester aggregate root. It represents the bounded context for
 * semester-based event planning.
 */

import type { PlannerWeekEvent } from "@/features/weekly-schedule/lib/week-types";

export type PlannerEventCategory =
  | "Exam"
  | "Language Exam"
  | "Group Event"
  | "Private Event"
  | "Other";

export const plannerEventCategories: PlannerEventCategory[] = [
  "Exam",
  "Language Exam",
  "Group Event",
  "Private Event",
  "Other",
];

export type PlannerEvent = {
  id: string;
  title: string;
  category: PlannerEventCategory;
  startDate: string | null;
  endDate: string | null;
  participants: string[];
};

export type PlannerMonth = {
  label: string;
  year: number;
  monthIndex: number;
};

export type PlannerSemesterId = "spring-2026" | "fall-2026";

export type PlannerSemester = {
  id: PlannerSemesterId;
  label: string;
  dateRangeLabel: string;
  description: string;
  months: PlannerMonth[];
  events: PlannerEvent[];
  weekEvents: PlannerWeekEvent[];
};

export type PlannerViewKey = "calendar" | "crosstables" | "list" | "week";

export type PlannerView = {
  key: PlannerViewKey;
  label: string;
  href: string;
  description: string;
};
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

// Starting with an empty friends list!
export const SEMESTER_FRIENDS: string[] = [];

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

export function getPlannerSemester(
  semesterId: string | null | undefined = defaultPlannerSemesterId,
): PlannerSemester {
  return (
    plannerSemesters.find((semester) => semester.id === semesterId) ??
    plannerSemester
  );
}

export function getEventsForDate(
  dateKey: string,
  semesterId: string | null | undefined = defaultPlannerSemesterId,
) {
  return getPlannerSemester(semesterId).events.filter(
    (event) => event.startDate === dateKey,
  );
}

export function getInboxEvents(
  semesterId: string | null | undefined = defaultPlannerSemesterId,
) {
  return getPlannerSemester(semesterId).events.filter(
    (event) => !event.startDate,
  );
}

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

export function getChronologicalEvents(
  semesterId: string | null | undefined = defaultPlannerSemesterId,
): PlannerEvent[] {
  const semester = getPlannerSemester(semesterId);

  return [...semester.events].sort((left, right) => {
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

export function getSemesterMonths(
  semesterId: string | null | undefined = defaultPlannerSemesterId,
): PlannerMonth[] {
  return getPlannerSemester(semesterId).months;
}
