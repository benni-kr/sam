/**
 * Calendar Domain Types, Constants, and Aggregates
 *
 * This module contains types and logic specific to the calendar view and
 * the PlannerSemester aggregate root. It represents the bounded context for
 * semester-based event planning and dynamic semester generation.
 */

import type { PlannerWeekEvent } from "@/features/weekly-schedule/lib/week-types";

/**
 * The earliest allowable date in SAM (Spring 2026 start).
 * No event may start or end before this date.
 */
export const MIN_PLANNER_DATE = "2026-04-01";

/**
 * The permanent origin semester for SAM.
 */
export const ORIGIN_SEMESTER_ID = "spring-2026";

/**
 * The fixed category set for semester-based calendar events.
 */
export type PlannerEventCategory =
  | "Exam"
  | "Semi Exam"
  | "Group Event"
  | "Private Event"
  | "Other";

/**
 * The fixed set of planner categories used to classify semester events.
 */
export const plannerEventCategories: PlannerEventCategory[] = [
  "Exam",
  "Semi Exam",
  "Group Event",
  "Private Event",
  "Other",
];

/**
 * A calendar event stored in SAM.
 * Calendar events are date-driven and independent of a rigid semester assignment.
 */
export type PlannerEvent = {
  /** Stable event identifier used across persistence and drag/drop actions. */
  id: string;
  /** User-facing title shown in every planner view. */
  title: string;
  /** Optional freeform note shown in previews and detail views. */
  description?: string;
  /** Domain category used for filtering, theme lookup, and summaries. */
  category: PlannerEventCategory;
  /** Inclusive start date in YYYY-MM-DD format, or null when the event is in the inbox. */
  startDate: string | null;
  /** Inclusive end date in YYYY-MM-DD format, or null when the event is undated. */
  endDate: string | null;
  /** Optional start time in HH:MM 24-hour format. */
  startTime?: string | null;
  /** Optional end time in HH:MM 24-hour format. */
  endTime?: string | null;
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
 * Semester term: "spring" (Apr-Sep) or "fall" (Oct-Mar).
 */
export type PlannerSemesterTerm = "spring" | "fall";

/**
 * Semester identifier in `${term}-${year}` format (e.g. "spring-2026", "fall-2026").
 */
export type PlannerSemesterId = string;

/**
 * A complete semester aggregate with its calendar months and event collections.
 */
export type PlannerSemester = {
  /** Stable semester identifier used as the persistence and routing key. */
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

/**
 * Initial seed state for the friends domain.
 */
export const SEMESTER_FRIENDS: string[] = [];


/**
 * Parses a semester ID string into term and year.
 */
export function parseSemesterId(
  semesterId: string | null | undefined,
): { term: PlannerSemesterTerm; year: number } | null {
  if (!semesterId) return null;
  const match = semesterId.trim().match(/^(spring|fall)-(\d{4})$/i);
  if (!match) return null;

  return {
    term: match[1].toLowerCase() as PlannerSemesterTerm,
    year: parseInt(match[2], 10),
  };
}

/**
 * Formats a term and year into a canonical semester ID.
 */
export function formatSemesterId(term: PlannerSemesterTerm, year: number): PlannerSemesterId {
  return `${term.toLowerCase()}-${year}`;
}

/**
 * Pure generator to construct a full PlannerSemester object for any term and year.
 */
export function buildSemester(term: PlannerSemesterTerm, year: number): PlannerSemester {
  const isSpring = term === "spring";
  const id = formatSemesterId(term, year);
  const label = `${isSpring ? "Spring" : "Fall"} ${year}`;
  const dateRangeLabel = isSpring
    ? `April ${year} to September ${year}`
    : `October ${year} to March ${year + 1}`;
  const description = isSpring
    ? `Collaborative workspace for ${label}.`
    : `Collaborative workspace for ${label}.`;

  const months: PlannerMonth[] = isSpring
    ? [
        { label: "April", year, monthIndex: 3 },
        { label: "May", year, monthIndex: 4 },
        { label: "June", year, monthIndex: 5 },
        { label: "July", year, monthIndex: 6 },
        { label: "August", year, monthIndex: 7 },
        { label: "September", year, monthIndex: 8 },
      ]
    : [
        { label: "October", year, monthIndex: 9 },
        { label: "November", year, monthIndex: 10 },
        { label: "December", year, monthIndex: 11 },
        { label: "January", year: year + 1, monthIndex: 0 },
        { label: "February", year: year + 1, monthIndex: 1 },
        { label: "March", year: year + 1, monthIndex: 2 },
      ];

  return {
    id,
    label,
    dateRangeLabel,
    description,
    months,
    events: [],
    weekEvents: [],
  };
}

/**
 * Returns the inclusive start and end date (in YYYY-MM-DD format) for a semester.
 */
export function getSemesterDateRange(semester: PlannerSemester): {
  startDate: string;
  endDate: string;
} {
  const firstMonth = semester.months[0];
  const lastMonth = semester.months[semester.months.length - 1];

  const startDate = `${firstMonth.year}-${String(firstMonth.monthIndex + 1).padStart(2, "0")}-01`;
  // Last day of last month
  const lastDayDate = new Date(lastMonth.year, lastMonth.monthIndex + 1, 0);
  const endDate = `${lastMonth.year}-${String(lastMonth.monthIndex + 1).padStart(2, "0")}-${String(lastDayDate.getDate()).padStart(2, "0")}`;

  return { startDate, endDate };
}

/**
 * Checks if a calendar event overlaps with a semester's 6-month date range.
 */
export function eventOverlapsSemester(
  event: PlannerEvent,
  semester: PlannerSemester,
): boolean {
  if (!event.startDate) {
    return false;
  }

  const { startDate: semStart, endDate: semEnd } = getSemesterDateRange(semester);
  const eventEnd = event.endDate ?? event.startDate;

  return event.startDate <= semEnd && eventEnd >= semStart;
}

/**
 * Clamps any date to not precede MIN_PLANNER_DATE (2026-04-01).
 */
export function clampToMinDate(dateKey: string | null | undefined): string | null {
  if (!dateKey) return null;
  return dateKey < MIN_PLANNER_DATE ? MIN_PLANNER_DATE : dateKey;
}

/**
 * Normalizes start and end dates ensuring:
 * 1. Undated stays undated.
 * 2. Start date is never before MIN_PLANNER_DATE (2026-04-01).
 * 3. End date is never before start date or MIN_PLANNER_DATE.
 */
export function normalizeDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
) {
  if (!startDate) {
    return {
      startDate: null,
      endDate: null,
    };
  }

  const clampedStart = clampToMinDate(startDate)!;
  let clampedEnd = clampToMinDate(endDate);

  if (!clampedEnd || clampedEnd < clampedStart) {
    clampedEnd = clampedStart;
  }

  return {
    startDate: clampedStart,
    endDate: clampedEnd,
  };
}

/**
 * Resolves the semester ID that a given calendar date belongs to.
 * April - September => spring-${year}
 * October - December => fall-${year}
 * January - March => fall-${year - 1}
 */
export function getSemesterIdForDate(
  dateKey: string | null | undefined,
): PlannerSemesterId {
  if (!dateKey) {
    return getCurrentSemesterId();
  }

  const parts = dateKey.split("-");
  if (parts.length < 2) {
    return getCurrentSemesterId();
  }

  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;

  if (isNaN(year) || isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return getCurrentSemesterId();
  }

  if (monthIndex >= 3 && monthIndex <= 8) {
    return formatSemesterId("spring", year);
  }

  if (monthIndex >= 9) {
    return formatSemesterId("fall", year);
  }

  return formatSemesterId("fall", year - 1);
}

/**
 * Resolves the current semester ID based on a reference date (defaulting to now).
 */
export function getCurrentSemesterId(referenceDate: Date = new Date()): PlannerSemesterId {
  const year = referenceDate.getFullYear();
  const monthIndex = referenceDate.getMonth();

  if (monthIndex >= 3 && monthIndex <= 8) {
    return formatSemesterId("spring", year);
  }

  if (monthIndex >= 9) {
    return formatSemesterId("fall", year);
  }

  return formatSemesterId("fall", year - 1);
}

/**
 * Returns the next semester in chronological sequence.
 * spring-YYYY => fall-YYYY
 * fall-YYYY => spring-(YYYY + 1)
 */
export function getNextSemesterId(semesterId: string): PlannerSemesterId {
  const parsed = parseSemesterId(semesterId);
  if (!parsed) return semesterId;

  if (parsed.term === "spring") {
    return formatSemesterId("fall", parsed.year);
  }

  return formatSemesterId("spring", parsed.year + 1);
}

/**
 * Returns the previous semester in chronological sequence.
 * fall-YYYY => spring-YYYY
 * spring-YYYY => fall-(YYYY - 1)
 */
export function getPreviousSemesterId(semesterId: string): PlannerSemesterId {
  const parsed = parseSemesterId(semesterId);
  if (!parsed) return semesterId;

  if (parsed.term === "fall") {
    return formatSemesterId("spring", parsed.year);
  }

  return formatSemesterId("fall", parsed.year - 1);
}

/**
 * Compares two semester IDs chronologically.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareSemesterIds(a: string, b: string): number {
  const parsedA = parseSemesterId(a);
  const parsedB = parseSemesterId(b);

  if (!parsedA && !parsedB) return 0;
  if (!parsedA) return -1;
  if (!parsedB) return 1;

  const rankA = parsedA.year * 2 + (parsedA.term === "fall" ? 1 : 0);
  const rankB = parsedB.year * 2 + (parsedB.term === "fall" ? 1 : 0);

  return rankA - rankB;
}

/**
 * Resolves a semester by id, dynamically generating it if necessary.
 * Falls back to the current semester if the ID is missing or invalid.
 */
export function getPlannerSemester(
  semesterId: string | null | undefined = getCurrentSemesterId(),
  referenceDate: Date = new Date(),
): PlannerSemester {
  const parsed = parseSemesterId(semesterId);
  if (parsed) {
    return buildSemester(parsed.term, parsed.year);
  }

  const currentId = getCurrentSemesterId(referenceDate);
  const currentParsed = parseSemesterId(currentId)!;
  return buildSemester(currentParsed.term, currentParsed.year);
}

/**
 * Generates the list of selectable semesters for the user:
 * - Starts at Spring 2026 (the fixed origin).
 * - Includes all historical semesters.
 * - Includes the current semester.
 * - Includes one semester into the future (current + 1).
 * - Automatically expands to include any further future semester that contains scheduled events.
 */
export function getAvailableSemesters(
  events: PlannerEvent[] = [],
  referenceDate: Date = new Date(),
): PlannerSemester[] {
  const currentId = getCurrentSemesterId(referenceDate);
  const futureId = getNextSemesterId(currentId);

  let targetEndId = futureId;

  // If any events exist in future semesters beyond current + 1, expand to include them
  for (const event of events) {
    if (event.startDate) {
      const eventSemesterId = getSemesterIdForDate(event.startDate);
      if (compareSemesterIds(eventSemesterId, targetEndId) > 0) {
        targetEndId = eventSemesterId;
      }
    }
    if (event.endDate) {
      const eventSemesterId = getSemesterIdForDate(event.endDate);
      if (compareSemesterIds(eventSemesterId, targetEndId) > 0) {
        targetEndId = eventSemesterId;
      }
    }
  }

  const result: PlannerSemester[] = [];
  let curId: string = ORIGIN_SEMESTER_ID;

  while (compareSemesterIds(curId, targetEndId) <= 0) {
    result.push(getPlannerSemester(curId));
    curId = getNextSemesterId(curId);
  }

  return result;
}

/**
 * Dynamic default semester ID based on current date.
 */
export const defaultPlannerSemesterId: PlannerSemesterId = getCurrentSemesterId();

/**
 * Default semester aggregate.
 */
export const plannerSemester: PlannerSemester = getPlannerSemester(defaultPlannerSemesterId);

/**
 * Pre-computed list of baseline semesters for backward compatibility.
 */
export const plannerSemesters: PlannerSemester[] = getAvailableSemesters();

/**
 * Pre-computed list of baseline semester IDs for backward compatibility.
 */
export const plannerSemesterIds: PlannerSemesterId[] = plannerSemesters.map(
  (s) => s.id,
);

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
 * Returns the events that begin on a specific calendar date within a semester.
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
