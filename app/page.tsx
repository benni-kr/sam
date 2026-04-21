type PlannerEvent = {
  id: string;
  title: string;
  category: string;
  startDate: string | null;
  endDate: string | null;
  participants: string[];
};

const events: PlannerEvent[] = [
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

const months = [
  { label: "April", monthIndex: 3 },
  { label: "May", monthIndex: 4 },
  { label: "June", monthIndex: 5 },
  { label: "July", monthIndex: 6 },
  { label: "August", monthIndex: 7 },
  { label: "September", monthIndex: 8 },
];

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildMonthDays(year: number, monthIndex: number) {
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

function getEventsForDate(dateKey: string) {
  return events.filter((event) => event.startDate === dateKey);
}

function getInboxEvents() {
  return events.filter((event) => !event.startDate);
}

function categoryTone(category: string) {
  switch (category) {
    case "Social":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "Study":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "Admin":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
    case "Trip":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "Inbox":
      return "border-stone-200 bg-stone-100 text-stone-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function EventBadge({ event }: { event: PlannerEvent }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 shadow-sm ${categoryTone(event.category)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-5 text-slate-950">
          {event.title}
        </p>
        <span className="rounded-full border border-current/10 bg-white/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-current/70">
          {event.category}
        </span>
      </div>
      <p className="mt-1 text-xs leading-4 text-slate-600">
        {event.participants.join(" · ")}
      </p>
    </div>
  );
}

export default function Home() {
  const inboxEvents = getInboxEvents();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f7f3,_#efede6_55%,_#e7e2d7)] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/75 px-5 py-5 shadow-[0_1px_0_rgba(15,23,42,0.04),0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:px-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Semester Aktivity Manager
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                SAM planner shell
              </h1>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              April 2026 to September 2026
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            A fixed semester workspace for shared planning, with scheduled
            events mapped into the calendar and loose ideas parked in the inbox
            below.
          </p>
        </header>

        <section className="flex min-h-0 flex-1 flex-col gap-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Calendar View
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  Six-month grid for the semester
                </h2>
              </div>
              <div className="hidden text-sm text-slate-500 md:block">
                Fixed layout, shared later with drag and drop.
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {months.map(({ label, monthIndex }) => {
                const cells = buildMonthDays(2026, monthIndex);
                const monthLabel = monthFormatter.format(
                  new Date(2026, monthIndex, 1),
                );

                return (
                  <article
                    key={label}
                    className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          {label}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                          {monthLabel}
                        </h3>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                        2026
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                      {weekdayLabels.map((weekday) => (
                        <div key={weekday} className="pb-1">
                          {weekday}
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 grid grid-cols-7 gap-1">
                      {cells.map((day, index) => {
                        if (!day) {
                          return (
                            <div
                              key={`empty-${label}-${index}`}
                              className="h-24 rounded-2xl"
                            />
                          );
                        }

                        const date = new Date(2026, monthIndex, day);
                        const dateKey = formatDateKey(date);
                        const dayEvents = getEventsForDate(dateKey);

                        return (
                          <div
                            key={dateKey}
                            className="group flex h-24 flex-col rounded-2xl border border-slate-200 bg-white px-2 py-2 transition-colors hover:bg-slate-50"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-slate-500">
                                {day}
                              </span>
                              {dayEvents.length > 0 ? (
                                <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                  {dayEvents.length}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-2 flex flex-1 flex-col gap-1 overflow-hidden">
                              {dayEvents.slice(0, 2).map((event) => (
                                <div
                                  key={event.id}
                                  className="truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] leading-4 text-slate-700"
                                >
                                  {event.title}
                                </div>
                              ))}
                              {dayEvents.length > 2 ? (
                                <div className="text-[11px] text-slate-400">
                                  +{dayEvents.length - 2} more
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <section className="rounded-[2rem] border border-dashed border-slate-300 bg-[#faf7f0]/90 p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] sm:p-5">
            <div className="mb-4 flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Inbox
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  Unscheduled events waiting for a date
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                These items can be dragged into the calendar once interaction
                lands.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {inboxEvents.map((event) => (
                <EventBadge key={event.id} event={event} />
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
