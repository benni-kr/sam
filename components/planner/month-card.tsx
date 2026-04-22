"use client";

import { CalendarDayCell } from "@/components/planner/calendar-day-cell";
import {
  MonthWeekEventOverlay,
  buildMonthWeekEventLayouts,
  getMonthWeekRowHeight,
} from "@/components/planner/event-overlay";
import {
  buildMonthDays,
  formatDateKey,
  weekdayLabels,
  type PlannerMonth,
} from "@/lib/planner";
import { usePlannerState } from "@/components/planner/planner-state";

type MonthCardProps = {
  month: PlannerMonth;
};

/**
 * Displays one month grid with a row-level multi-day event overlay.
 */
export function MonthCard({ month }: MonthCardProps) {
  const { events } = usePlannerState();
  const cells = buildMonthDays(month.year, month.monthIndex);
  const rowLayouts = buildMonthWeekEventLayouts({
    month,
    cells,
    events,
  });
  const rowCount = Math.ceil(cells.length / 7);

  return (
    <article className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {month.label}
          </p>
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

      <div className="relative">
        {Array.from({ length: rowCount }, (_, rowIndex) => {
          const rowCells = cells.slice(rowIndex * 7, rowIndex * 7 + 7);
          const rowLayout = rowLayouts[rowIndex] ?? {
            laneCount: 0,
            segments: [],
          };
          const rowHeight = getMonthWeekRowHeight(rowLayout.laneCount);

          return (
            <div
              key={`${month.year}-${month.monthIndex}-row-${rowIndex}`}
              className="relative grid grid-cols-7"
              style={{ minHeight: rowHeight }}
            >
              {rowCells.map((day, columnIndex) => {
                const absoluteIndex = rowIndex * 7 + columnIndex;
                const isWeekend = columnIndex >= 5;
                // Visually marks days outside the current month in each row.
                const stripedBackground =
                  "bg-[repeating-linear-gradient(135deg,_rgba(148,163,184,0.18)_0,_rgba(148,163,184,0.18)_8px,_rgba(248,250,252,0.72)_8px,_rgba(248,250,252,0.72)_16px)]";

                if (!day) {
                  return (
                    <div
                      key={`empty-${month.year}-${month.monthIndex}-${absoluteIndex}`}
                      className={`h-full min-h-28 border-b border-r border-slate-200 last:border-r-0 ${stripedBackground}`}
                    />
                  );
                }

                const date = new Date(month.year, month.monthIndex, day);
                const dateKey = formatDateKey(date);

                return (
                  <CalendarDayCell
                    key={dateKey}
                    day={day}
                    dateKey={dateKey}
                    isWeekend={isWeekend}
                  />
                );
              })}

              <MonthWeekEventOverlay
                laneCount={rowLayout.laneCount}
                segments={rowLayout.segments}
              />
            </div>
          );
        })}
      </div>
    </article>
  );
}
