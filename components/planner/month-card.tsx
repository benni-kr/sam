import {
  buildMonthDays,
  formatDateKey,
  getEventsForDate,
  monthFormatter,
  type PlannerMonth,
  weekdayLabels,
} from "@/lib/planner";

type MonthCardProps = {
  month: PlannerMonth;
  semesterId: string;
};

export function MonthCard({ month, semesterId }: MonthCardProps) {
  const cells = buildMonthDays(month.year, month.monthIndex);
  const monthLabel = monthFormatter.format(
    new Date(month.year, month.monthIndex, 1),
  );

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {month.label}
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
                key={`empty-${month.year}-${month.monthIndex}-${index}`}
                className="h-24 rounded-2xl"
              />
            );
          }

          const date = new Date(month.year, month.monthIndex, day);
          const dateKey = formatDateKey(date);
          const dayEvents = getEventsForDate(dateKey, semesterId);

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
}
