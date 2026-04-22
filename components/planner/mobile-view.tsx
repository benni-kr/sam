"use client";

import { usePlannerState } from "@/components/planner/planner-state";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  weekday: "short",
});

function formatDateKeyLabel(dateKey: string) {
  return dateFormatter.format(new Date(`${dateKey}T12:00:00`));
}

function mobileCategoryTone(category: string) {
  switch (category) {
    case "Exam":
      return "border-violet-200 bg-violet-50 text-violet-900";
    case "Group Event":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "Private Event":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "Other":
      return "border-sky-200 bg-sky-50 text-sky-900";
    default:
      return "border-stone-200 bg-stone-50 text-stone-700";
  }
}

/**
 * Displays a chronological timeline optimized for narrow screens.
 */
export function MobileView() {
  const { chronologicalEvents: events } = usePlannerState();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-5">
        <div className="space-y-4">
          {events.map((event, index) => {
            const scheduledLabel = event.startDate
              ? event.endDate && event.endDate !== event.startDate
                ? `${formatDateKeyLabel(event.startDate)} to ${formatDateKeyLabel(event.endDate)}`
                : formatDateKeyLabel(event.startDate)
              : "Unscheduled";

            return (
              <article
                key={event.id}
                className="relative rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
              >
                {index < events.length - 1 ? (
                  <div className="absolute bottom-[-1.1rem] left-6 h-4 w-px bg-slate-200" />
                ) : null}

                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-slate-500">
                    {event.startDate
                      ? new Date(`${event.startDate}T12:00:00`).getDate()
                      : "--"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {event.title}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                          {scheduledLabel}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${mobileCategoryTone(event.category)}`}
                      >
                        {event.category}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {event.participants.map((participant) => (
                        <span
                          key={participant}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600"
                        >
                          {participant}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
