export type PlannerEventCategory =
  | "Exams"
  | "Group Events"
  | "Private Events"
  | "Inbox";

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
};

export type PlannerViewKey = "calendar" | "mindmap" | "mobile";

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

const springSemesterEvents: PlannerEvent[] = [
  {
    id: "evt-1",
    title: "Semester kickoff picnic",
    category: "Group Events",
    startDate: "2026-04-11",
    endDate: "2026-04-11",
    participants: ["Maya", "Leo", "Nina"],
  },
  {
    id: "evt-2",
    title: "Course registration check-in",
    category: "Private Events",
    startDate: "2026-04-24",
    endDate: "2026-04-24",
    participants: ["Ava", "Mika"],
  },
  {
    id: "evt-3",
    title: "Library sprint",
    category: "Exams",
    startDate: "2026-05-08",
    endDate: "2026-05-09",
    participants: ["Jules", "Nina", "Sam"],
  },
  {
    id: "evt-4",
    title: "Cottage weekend",
    category: "Group Events",
    startDate: "2026-06-19",
    endDate: "2026-06-21",
    participants: ["Maya", "Leo", "Tara"],
  },
  {
    id: "evt-5",
    title: "Midterm review dinner",
    category: "Exams",
    startDate: "2026-07-03",
    endDate: "2026-07-03",
    participants: ["Ava", "Jules", "Nina"],
  },
  {
    id: "evt-6",
    title: "Lab prep block",
    category: "Exams",
    startDate: "2026-08-14",
    endDate: "2026-08-14",
    participants: ["Sam", "Tara"],
  },
  {
    id: "evt-7",
    title: "Beach day idea",
    category: "Inbox",
    startDate: null,
    endDate: null,
    participants: ["Maya", "Leo", "Nina"],
  },
  {
    id: "evt-8",
    title: "Budget brunch",
    category: "Inbox",
    startDate: null,
    endDate: null,
    participants: ["Ava", "Sam"],
  },
  {
    id: "evt-9",
    title: "Last week wrap-up",
    category: "Private Events",
    startDate: "2026-09-18",
    endDate: "2026-09-18",
    participants: ["Jules", "Tara"],
  },
];

const fallSemesterEvents: PlannerEvent[] = [
  {
    id: "evt-10",
    title: "Orientation retreat",
    category: "Group Events",
    startDate: "2026-10-10",
    endDate: "2026-10-12",
    participants: ["Maya", "Sam", "Tara"],
  },
  {
    id: "evt-11",
    title: "Midterm hack night",
    category: "Exams",
    startDate: "2026-11-06",
    endDate: "2026-11-06",
    participants: ["Ava", "Jules", "Nina"],
  },
  {
    id: "evt-12",
    title: "Winter film festival",
    category: "Group Events",
    startDate: "2026-12-04",
    endDate: "2026-12-04",
    participants: ["Leo", "Mika", "Tara"],
  },
  {
    id: "evt-13",
    title: "January planning sprint",
    category: "Private Events",
    startDate: "2027-01-15",
    endDate: "2027-01-16",
    participants: ["Ava", "Maya", "Sam"],
  },
  {
    id: "evt-14",
    title: "Project week",
    category: "Exams",
    startDate: "2027-02-09",
    endDate: "2027-02-12",
    participants: ["Jules", "Leo", "Nina"],
  },
  {
    id: "evt-15",
    title: "Spring break cabin",
    category: "Group Events",
    startDate: "2027-03-12",
    endDate: "2027-03-14",
    participants: ["Maya", "Leo", "Tara"],
  },
  {
    id: "evt-16",
    title: "Shared budget ideas",
    category: "Inbox",
    startDate: null,
    endDate: null,
    participants: ["Ava", "Mika", "Sam"],
  },
  {
    id: "evt-17",
    title: "Venue shortlist",
    category: "Inbox",
    startDate: null,
    endDate: null,
    participants: ["Jules", "Maya"],
  },
];

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
    events: springSemesterEvents,
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
    events: fallSemesterEvents,
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
    key: "mindmap",
    label: "Mind maps",
    href: "/mindmap",
    description: "One map per category",
  },
  {
    key: "mobile",
    label: "Mobile list",
    href: "/mobile",
    description: "Chronological compact view",
  },
];

export const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];

export const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function buildMonthDays(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  const cells: Array<number | null> = Array.from(
    { length: leadingEmptyDays },
    () => null,
  );

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

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
