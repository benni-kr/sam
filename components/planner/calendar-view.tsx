import { EventBadge } from "@/components/planner/event-badge";
import { MonthCard } from "@/components/planner/month-card";
import { getInboxEvents, getPlannerSemester } from "@/lib/planner";

type CalendarViewProps = {
  semesterId?: string | null;
};

export function CalendarView({ semesterId }: CalendarViewProps) {
  const semester = getPlannerSemester(semesterId);
  const inboxEvents = getInboxEvents(semester.id);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Calendar View
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              Six-month grid for {semester.label}
            </h2>
          </div>
          <div className="hidden text-sm text-slate-500 md:block">
            Fixed layout, shared later with drag and drop.
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {semester.months.map((month) => (
            <MonthCard
              key={`${month.year}-${month.monthIndex}`}
              month={month}
              semesterId={semester.id}
            />
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
            These items can be dragged into the calendar once interaction lands.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {inboxEvents.map((event) => (
            <EventBadge key={event.id} event={event} />
          ))}
        </div>
      </section>
    </section>
  );
}
