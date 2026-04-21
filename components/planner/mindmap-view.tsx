"use client";

import { usePlannerState } from "@/components/planner/planner-state";

const categoryStyles: Record<
  string,
  { ring: string; badge: string; dot: string }
> = {
  Exams: {
    ring: "border-violet-200 bg-violet-50/80",
    badge: "bg-violet-100 text-violet-900",
    dot: "bg-violet-400",
  },
  "Group Events": {
    ring: "border-emerald-200 bg-emerald-50/80",
    badge: "bg-emerald-100 text-emerald-900",
    dot: "bg-emerald-400",
  },
  "Private Events": {
    ring: "border-amber-200 bg-amber-50/80",
    badge: "bg-amber-100 text-amber-900",
    dot: "bg-amber-400",
  },
  Inbox: {
    ring: "border-stone-200 bg-stone-50/80",
    badge: "bg-stone-100 text-stone-700",
    dot: "bg-stone-400",
  },
};

/**
 * Presents semester events grouped by category with participant chips.
 */
export function MindMapView() {
  const { categorySummaries } = usePlannerState();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="grid gap-4 xl:grid-cols-2">
        {categorySummaries.map((summary) => {
          const styles = categoryStyles[summary.category];

          return (
            <article
              key={summary.category}
              className={`rounded-[1.75rem] border p-5 shadow-sm ${styles.ring}`}
            >
              <div className="flex items-start justify-between gap-4 border-b border-black/5 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${styles.dot}`}
                    />
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {summary.category}
                    </p>
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">
                    {summary.count} event{summary.count === 1 ? "" : "s"}
                  </h3>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] ${styles.badge}`}
                >
                  Category
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                  {summary.events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {event.title}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                            {event.startDate ?? "Unscheduled"}
                            {event.endDate && event.endDate !== event.startDate
                              ? ` to ${event.endDate}`
                              : ""}
                          </p>
                        </div>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                          {event.participants.length} people
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Participants
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {summary.participants.map((participant) => (
                      <span
                        key={participant}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                      >
                        {participant}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    This participant layer is the bridge to a fuller graph view
                    later on, when we connect the mind map to a dedicated
                    canvas.
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
