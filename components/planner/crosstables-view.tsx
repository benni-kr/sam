"use client";

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

/**
 * Cross-table view to manage participants per event by category.
 */
export function CrosstablesView() {
  const { events, toggleParticipant } = usePlannerState();

  const participantNames = Array.from(
    new Set([...SEMESTER_FRIENDS, ...events.flatMap((event) => event.participants)]),
  );

  const eventsByCategory = plannerEventCategories.reduce(
    (acc, category) => {
      acc[category] = sortCategoryEvents(
        events.filter((event) => event.category === category),
      );
      return acc;
    },
    {} as Record<PlannerEventCategory, PlannerEvent[]>,
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="rounded-[1.5rem] border border-white/70 bg-white/80 px-5 py-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Crosstables
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">Who&apos;s in?</h2>
      </header>

      <div className="grid gap-4">
        {plannerEventCategories.map((category) => {
          const categoryEvents = eventsByCategory[category];
          const styles = categoryStyles[category];

          return (
            <article
              key={category}
              className={`rounded-[1.5rem] border p-4 shadow-sm ${styles.section}`}
            >
              <div className="mb-3 flex items-center gap-2 border-b border-black/5 pb-3">
                <span className={`h-2.5 w-2.5 rounded-full ${styles.accent}`} />
                <h3 className={`text-sm font-semibold uppercase tracking-[0.2em] ${styles.heading}`}>
                  {category}
                </h3>
                <span className="rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  {categoryEvents.length} event{categoryEvents.length === 1 ? "" : "s"}
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
                        <tr key={`${category}-${event.id}`} className="odd:bg-white even:bg-slate-50/50">
                          <td className="sticky left-0 z-10 border-r border-slate-200 bg-inherit px-3 py-2">
                            <p className="font-medium text-slate-900">{event.title}</p>
                            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                              {event.startDate ?? "Undated"}
                              {event.endDate && event.endDate !== event.startDate
                                ? ` to ${event.endDate}`
                                : ""}
                            </p>
                          </td>

                          {participantNames.map((participantName) => {
                            const checked = event.participants.includes(participantName);

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
                                      toggleParticipant(event.id, participantName)
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
