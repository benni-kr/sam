"use client";

import { DraggableEvent } from "@/features/planner/components/draggable-event";
import {
  formatDateKey,
  type PlannerEvent,
  type PlannerMonth,
} from "@/features/planner/lib/planner";

type MonthWeekEventSegment = {
  event: PlannerEvent;
  startColumn: number;
  columnSpan: number;
  lane: number;
  showLabel: boolean;
  roundLeft: boolean;
  roundRight: boolean;
};

type MonthWeekEventLayout = {
  laneCount: number;
  segments: MonthWeekEventSegment[];
};

type BuildMonthWeekEventLayoutsArgs = {
  month: PlannerMonth;
  cells: (number | null)[];
  events: PlannerEvent[];
};

const WEEK_SIZE = 7;
const DAY_HEADER_HEIGHT = 28;
const MIN_EVENT_LANES = 3;
const EVENT_LANE_HEIGHT = 32;
const ROW_VERTICAL_PADDING = 4;

/**
 * Computes per-week event segments and lane assignments for calendar rendering.
 */
export function buildMonthWeekEventLayouts({
  month,
  cells,
  events,
}: BuildMonthWeekEventLayoutsArgs): MonthWeekEventLayout[] {
  const rowLayouts: MonthWeekEventLayout[] = [];
  const rows = Math.ceil(cells.length / WEEK_SIZE);

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const rowCells = cells.slice(
      rowIndex * WEEK_SIZE,
      rowIndex * WEEK_SIZE + WEEK_SIZE,
    );
    const rowDateKeys = rowCells
      .map((day) => {
        if (!day) {
          return null;
        }

        return formatDateKey(new Date(month.year, month.monthIndex, day));
      })
      .filter((dateKey): dateKey is string => dateKey !== null);

    if (rowDateKeys.length === 0) {
      rowLayouts.push({ laneCount: 0, segments: [] });
      continue;
    }

    const rowStartDateKey = rowDateKeys[0];
    const rowEndDateKey = rowDateKeys[rowDateKeys.length - 1];

    const columnByDateKey = new Map<string, number>();
    rowCells.forEach((day, columnIndex) => {
      if (!day) {
        return;
      }

      const dateKey = formatDateKey(
        new Date(month.year, month.monthIndex, day),
      );
      columnByDateKey.set(dateKey, columnIndex + 1);
    });

    const rowEvents = events
      .filter((event) => {
        if (!event.startDate) {
          return false;
        }

        const eventEndDate = event.endDate ?? event.startDate;
        return (
          event.startDate <= rowEndDateKey && eventEndDate >= rowStartDateKey
        );
      })
      .map((event) => {
        const eventStartDate = event.startDate!;
        const eventEndDate = event.endDate ?? event.startDate!;
        const visibleStartDate =
          eventStartDate > rowStartDateKey ? eventStartDate : rowStartDateKey;
        const visibleEndDate =
          eventEndDate < rowEndDateKey ? eventEndDate : rowEndDateKey;
        const startColumn = columnByDateKey.get(visibleStartDate);
        const endColumn = columnByDateKey.get(visibleEndDate);

        if (!startColumn || !endColumn) {
          return null;
        }

        return {
          event,
          startColumn,
          columnSpan: endColumn - startColumn + 1,
          showLabel: true as boolean,
          roundLeft: visibleStartDate === eventStartDate,
          roundRight: visibleEndDate === eventEndDate,
        } satisfies Omit<MonthWeekEventSegment, "lane">;
      })
      .filter(
        (segment): segment is Omit<MonthWeekEventSegment, "lane"> =>
          segment !== null,
      )
      .sort((left, right) => {
        if (left.startColumn !== right.startColumn) {
          return left.startColumn - right.startColumn;
        }

        if (left.columnSpan !== right.columnSpan) {
          return left.columnSpan - right.columnSpan;
        }

        const titleComparison = left.event.title.localeCompare(
          right.event.title,
        );
        if (titleComparison !== 0) {
          return titleComparison;
        }

        return left.event.id.localeCompare(right.event.id);
      });

    const laneEndColumns: number[] = [];
    const segments: MonthWeekEventSegment[] = [];

    for (const segment of rowEvents) {
      let lane = laneEndColumns.findIndex(
        (endColumn) => endColumn < segment.startColumn,
      );

      if (lane === -1) {
        lane = laneEndColumns.length;
        laneEndColumns.push(segment.startColumn + segment.columnSpan - 1);
      } else {
        laneEndColumns[lane] = segment.startColumn + segment.columnSpan - 1;
      }

      segments.push({
        ...segment,
        lane,
      });
    }

    rowLayouts.push({
      laneCount: laneEndColumns.length,
      segments,
    });
  }

  return rowLayouts;
}

export function getMonthWeekRowHeight(laneCount: number) {
  return (
    DAY_HEADER_HEIGHT +
    Math.max(MIN_EVENT_LANES, laneCount) * EVENT_LANE_HEIGHT +
    ROW_VERTICAL_PADDING
  );
}

/**
 * Paints the segmented multi-day bars on top of one calendar row.
 */
export function MonthWeekEventOverlay({
  laneCount,
  segments,
}: MonthWeekEventLayout) {
  if (segments.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[1.75rem] bottom-0 pt-1">
      <div
        className="grid h-full grid-cols-7 content-start"
        style={{
          gridTemplateRows: `repeat(${Math.max(MIN_EVENT_LANES, laneCount)}, ${EVENT_LANE_HEIGHT}px)`,
        }}
      >
        {segments.map((segment) => (
          <div
            key={segment.event.id}
            className="pointer-events-auto min-w-0 px-1"
            style={{
              gridColumn: `${segment.startColumn} / span ${segment.columnSpan}`,
              gridRow: segment.lane + 1,
            }}
          >
            <DraggableEvent event={segment.event}>
              <div
                className={`flex h-6 min-w-0 items-center border px-3 text-[10px] font-medium leading-4 ${getEventTone(
                  segment.event.category,
                )} ${getSegmentShape(segment.roundLeft, segment.roundRight)}`}
              >
                {segment.showLabel ? (
                  <span className="truncate">{segment.event.title}</span>
                ) : (
                  <span className="sr-only">{segment.event.title}</span>
                )}
              </div>
            </DraggableEvent>
          </div>
        ))}
      </div>
    </div>
  );
}

function getSegmentShape(roundLeft: boolean, roundRight: boolean) {
  if (roundLeft && roundRight) {
    return "rounded-md";
  }

  if (roundLeft) {
    return "rounded-l-md rounded-r-none";
  }

  if (roundRight) {
    return "rounded-r-md rounded-l-none";
  }

  return "rounded-none";
}

function getEventTone(category: PlannerEvent["category"]) {
  switch (category) {
    case "Exam":
      return "border-violet-300 bg-violet-100 text-violet-900";
    case "Language Exam":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "Group Event":
      return "border-emerald-300 bg-emerald-100 text-emerald-900";
    case "Private Event":
      return "border-amber-300 bg-amber-100 text-amber-900";
    case "Other":
      return "border-sky-300 bg-sky-100 text-sky-900";
    default:
      return "border-slate-300 bg-slate-100 text-slate-700";
  }
}
