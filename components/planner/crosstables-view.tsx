"use client";

import { useSearchParams } from "next/navigation";

import { usePlannerState } from "@/components/planner/planner-state";
import {
  SEMESTER_FRIENDS,
  plannerEventCategories,
  type PlannerEvent,
  type PlannerEventCategory,
} from "@/lib/planner";

const categoryStyles: Record<
  string,
  { section: string; heading: string; accent: string }
> = {
  Exam: {
    section: "border-violet-200 bg-violet-50/80",
    heading: "text-violet-900",
    accent: "bg-violet-500",
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

const categoryLabelsPlural: Record<PlannerEventCategory, string> = {
  Exam: "Exams",
  "Group Event": "Group Events",
  "Private Event": "Private Events",
  Other: "Others",
};

/**
 * Cross-table view to manage participants per event by category.
 */
export function CrosstablesView() {
  const searchParams = useSearchParams();
  const { events, inboxEvents, toggleParticipant } = usePlannerState();
  const hideFinished = searchParams.get("hideFinished") === "1";
  const hideUndated = searchParams.get("hideUndated") === "1";
  const todayDateKey = getTodayDateKey();

  const crosstableEvents = dedupeEventsById([
    ...events.filter((event) => Boolean(event.startDate)),
    ...inboxEvents,
  ]);

  const filteredCrosstableEvents = crosstableEvents.filter((event) => {
    if (!event.startDate) {
      return !hideUndated;
    }

    if (!hideFinished) {
      return true;
    }

    const endDate = event.endDate ?? event.startDate;

    return endDate >= todayDateKey;
  });

  const participantNames = Array.from(
    new Set([
      ...SEMESTER_FRIENDS,
      ...filteredCrosstableEvents.flatMap((event) => event.participants),
    ]),
  );

  const eventsByCategory = plannerEventCategories.reduce(
    (acc, category) => {
      acc[category] = sortCategoryEvents(
        filteredCrosstableEvents.filter((event) => event.category === category),
      );
      return acc;
    },
    {} as Record<PlannerEventCategory, PlannerEvent[]>,
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid gap-4">
        {plannerEventCategories.map((category) => {
          const categoryEvents = eventsByCategory[category];
          const styles = categoryStyles[category];

          return (
            <article
              key={category}
              className={`rounded-[1.5rem] border p-4 shadow-sm ${styles.section}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${styles.accent}`} />
                <h3
                  className={`text-sm font-semibold uppercase tracking-[0.2em] ${styles.heading}`}
                >
                  {categoryLabelsPlural[category]}
                </h3>
                <span className="ml-auto rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  {categoryEvents.length} event
                  {categoryEvents.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-xl border border-slate-200 bg-white/90 text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 min-w-[260px] border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Event
                      </th>
                      {participantNames.map((participantName) => (
                        <th
                          key={`${category}-${participantName}-header`}
                          className="border-b border-slate-200 bg-slate-50 px-1 py-2 text-center align-bottom"
                        >
                          <span className="inline-block origin-center -rotate-180 whitespace-nowrap text-[11px] font-medium tracking-[0.14em] text-slate-600 [writing-mode:vertical-rl]">
                            {participantName}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {categoryEvents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={participantNames.length + 1}
                          className="px-3 py-4 text-sm text-slate-500"
                        >
                          No events in this category yet.
                        </td>
                      </tr>
                    ) : (
                      categoryEvents.map((event) => (
                        <tr
                          key={`${category}-${event.id}`}
                          className="odd:bg-white even:bg-slate-50/50"
                        >
                          <td className="sticky left-0 z-10 border-r border-slate-200 bg-inherit px-3 py-2">
                            <p className="font-medium text-slate-900">
                              {event.title}
                            </p>
                            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                              {event.startDate
                                ? formatDisplayDate(event.startDate)
                                : "Undated"}
                              {event.endDate &&
                              event.endDate !== event.startDate
                                ? ` to ${formatDisplayDate(event.endDate)}`
                                : ""}
                            </p>
                          </td>

                          {participantNames.map((participantName) => {
                            const checked =
                              event.participants.includes(participantName);

                            return (
                              <td
                                key={`${event.id}-${participantName}`}
                                className="border-l border-slate-100 px-1 py-2 text-center"
                              >
                                <label className="inline-flex cursor-pointer items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      toggleParticipant(
                                        event.id,
                                        participantName,
                                      )
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                                  />
                                  <span className="sr-only">
                                    Toggle {participantName} for {event.title}
                                  </span>
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function sortCategoryEvents(events: PlannerEvent[]) {
  return [...events].sort((left, right) => {
    if (!left.startDate && !right.startDate) {
      return left.title.localeCompare(right.title);
    }

    if (!left.startDate) {
      return 1;
    }

    if (!right.startDate) {
      return -1;
    }

    const startDateComparison = left.startDate.localeCompare(right.startDate);

    if (startDateComparison !== 0) {
      return startDateComparison;
    }

    return left.title.localeCompare(right.title);
  });
}

function formatDisplayDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-");

  if (!year || !month || !day) {
    return dateKey;
  }

  return `${day}.${month}.${year}`;
}

function dedupeEventsById(events: PlannerEvent[]) {
  const eventMap = new Map<string, PlannerEvent>();

  for (const event of events) {
    eventMap.set(event.id, event);
  }

  return Array.from(eventMap.values());
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
