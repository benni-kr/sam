export type PlannerEventCategory =
  | "Social"
  | "Study"
  | "Admin"
  | "Trip"
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
  monthIndex: number;
};

export const plannerEvents: PlannerEvent[] = [
  {
    id: "evt-1",
    title: "Semester kickoff picnic",
    category: "Social",
    startDate: "2026-04-11",
    endDate: "2026-04-11",
    participants: ["Maya", "Leo", "Nina"],
  },
  {
    id: "evt-2",
    title: "Course registration check-in",
    category: "Admin",
    startDate: "2026-04-24",
    endDate: "2026-04-24",
    participants: ["Ava", "Mika"],
  },
  {
    id: "evt-3",
    title: "Library sprint",
    category: "Study",
    startDate: "2026-05-08",
    endDate: "2026-05-09",
    participants: ["Jules", "Nina", "Sam"],
  },
  {
    id: "evt-4",
    title: "Cottage weekend",
    category: "Trip",
    startDate: "2026-06-19",
    endDate: "2026-06-21",
    participants: ["Maya", "Leo", "Tara"],
  },
  {
    id: "evt-5",
    title: "Midterm review dinner",
    category: "Social",
    startDate: "2026-07-03",
    endDate: "2026-07-03",
    participants: ["Ava", "Jules", "Nina"],
  },
  {
    id: "evt-6",
    title: "Lab prep block",
    category: "Study",
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
    category: "Admin",
    startDate: "2026-09-18",
    endDate: "2026-09-18",
    participants: ["Jules", "Tara"],
  },
];

export const plannerMonths: PlannerMonth[] = [
  { label: "April", monthIndex: 3 },
  { label: "May", monthIndex: 4 },
  { label: "June", monthIndex: 5 },
  { label: "July", monthIndex: 6 },
  { label: "August", monthIndex: 7 },
  { label: "September", monthIndex: 8 },
];

export const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

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
  const leadingEmptyDays = firstDay.getDay();
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

export function getEventsForDate(dateKey: string) {
  return plannerEvents.filter((event) => event.startDate === dateKey);
}

export function getInboxEvents() {
  return plannerEvents.filter((event) => !event.startDate);
}
