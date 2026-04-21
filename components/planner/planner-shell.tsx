import { EventBadge } from "@/components/planner/event-badge";
import { MonthCard } from "@/components/planner/month-card";
import { getInboxEvents, plannerMonths } from "@/lib/planner";

export function PlannerShell() {
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
              {plannerMonths.map(({ label, monthIndex }) => (
                <MonthCard key={label} label={label} monthIndex={monthIndex} />
              ))}
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
