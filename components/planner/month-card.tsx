"use client";

import { CalendarDayCell } from "@/components/planner/calendar-day-cell";
import {
  buildMonthDays,
  formatDateKey,
  monthFormatter,
  type PlannerMonth,
  weekdayLabels,
} from "@/lib/planner";
import { usePlannerState } from "@/components/planner/planner-state";

type MonthCardProps = {
  month: PlannerMonth;
};

export function MonthCard({ month }: MonthCardProps) {
  const { getEventsCoveringDate } = usePlannerState();
  const cells = buildMonthDays(month.year, month.monthIndex);
  const monthLabel = monthFormatter.format(
    new Date(month.year, month.monthIndex, 1),
  );

  return (
    <article className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {month.label}
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            {monthLabel}
          </h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
          {month.year}
        </span>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
        {weekdayLabels.map((weekday, index) => (
          <div
            key={`${weekday}-${index}`}
            className="border-r border-slate-200 py-1 last:border-r-0"
          >
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${month.year}-${month.monthIndex}-${index}`}
                className="h-28 border-b border-r border-slate-200 bg-slate-50/30 last:border-r-0"
              />
            );
          }

          const date = new Date(month.year, month.monthIndex, day);
          const dateKey = formatDateKey(date);
          const dayEvents = getEventsCoveringDate(dateKey);

          return (
            <CalendarDayCell
              key={dateKey}
              day={day}
              dateKey={dateKey}
              events={dayEvents}
            />
          );
        })}
      </div>
    </article>
  );
}
