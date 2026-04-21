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
    case "Social":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "Study":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "Admin":
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
    case "Trip":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    default:
      return "border-stone-200 bg-stone-50 text-stone-700";
  }
}

export function MobileView() {
  const { activeSemester, chronologicalEvents: events } = usePlannerState();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Mobile list
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Chronological events for quick scanning
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
          This compact list mirrors the same semester data as the calendar and
          mind map. Scheduled items appear in order, and unscheduled items are
          kept at the bottom so they stay easy to find on a phone.
        </p>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-5">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Timeline
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              {activeSemester.label}
            </h3>
          </div>
          <p className="text-sm text-slate-500">
            Same semester data, reordered for small screens.
          </p>
        </div>

        <div className="mt-4 space-y-4">
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
