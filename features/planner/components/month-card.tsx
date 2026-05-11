"use client";

/**
 * Grid Coordinator for the calendar.
 *
 * This component slices a month's days into 7-column rows and keeps each
 * row's height in sync with the multi-day event overlay that paints on top of
 * it.
 */

import { CalendarDayCell } from "@/features/planner/components/calendar-day-cell";
import {
  MonthWeekEventOverlay,
  buildMonthWeekEventLayouts,
  getMonthWeekRowHeight,
} from "@/features/planner/components/event-overlay";
import {
  buildMonthDays,
  formatDateKey,
  weekdayLabels,
} from "@/features/planner/lib/planner-utils";
import { type PlannerMonth } from "@/features/planner/lib/planner";
import { usePlannerState } from "@/features/planner/state/planner-state";

type MonthCardProps = {
  month: PlannerMonth;
};

const STRIPED_BACKGROUND =
  "bg-[repeating-linear-gradient(135deg,_rgba(148,163,184,0.18)_0,_rgba(148,163,184,0.18)_8px,_rgba(248,250,252,0.72)_8px,_rgba(248,250,252,0.72)_16px)] dark:bg-[repeating-linear-gradient(135deg,_rgba(71,85,105,0.25)_0,_rgba(71,85,105,0.25)_8px,_rgba(15,23,42,0.5)_8px,_rgba(15,23,42,0.5)_16px)]";

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
    <article className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div>
          <p className="text-base font-semibold uppercase tracking-[0.22em] text-slate-500 sm:text-lg dark:text-slate-400">
            {month.label}
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          {month.year}
        </span>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500">
        {weekdayLabels.map((weekday: string, index: number) => (
          <div
            key={`${weekday}-${index}`}
            className="border-r border-slate-200 py-1 last:border-r-0 dark:border-slate-700"
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
              // Layout Contract: this row MUST be relative because the
              // `MonthWeekEventOverlay` relies on it as the positioning
              // context for multi-day bars spanning the week.
              className="relative grid grid-cols-7"
              style={{ minHeight: rowHeight }}
            >
              {rowCells.map((day, columnIndex) => {
                const absoluteIndex = rowIndex * 7 + columnIndex;
                const isWeekend = columnIndex >= 5;

                if (!day) {
                  return (
                    <div
                      key={`empty-${month.year}-${month.monthIndex}-${absoluteIndex}`}
                      className={`h-full min-h-28 border-b border-r border-slate-200 last:border-r-0 ${STRIPED_BACKGROUND}`}
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
