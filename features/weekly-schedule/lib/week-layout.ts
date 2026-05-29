import { type PlannerWeekEvent } from "@/features/weekly-schedule/lib/week-types";

export const WEEK_START_MINUTES = 6 * 60;
export const WEEK_END_MINUTES = 24 * 60;
export const MIN_EVENT_HEIGHT = 42;
// Default visible range: 08:00–18:00. Extended automatically when events
// fall outside this window; never exceeds WEEK_START/END_MINUTES.
export const DEFAULT_DISPLAY_START = 8 * 60;
export const DEFAULT_DISPLAY_END = 18 * 60;
// leading-tight at the respective font sizes, used to compute how many
// participant lines fit in the remaining block height.
export const TITLE_LINE_PX = 13;
export const PARTICIPANT_LINE_PX = 11;

export type DayLayout = {
  groups: EventGroup[];
};

export type EventGroup = {
  startMinutes: number;
  endMinutes: number;
  laneCount: number;
  items: PositionedWeekEvent[];
};

export type PositionedWeekEvent = {
  event: PlannerWeekEvent;
  lane: number;
  startMinutes: number;
  endMinutes: number;
};

export function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return WEEK_START_MINUTES;
  }
  return hours * 60 + minutes;
}

export function clampMinutes(minutes: number): number {
  return Math.min(WEEK_END_MINUTES, Math.max(WEEK_START_MINUTES, minutes));
}

export function formatHourLabel(hour: number): string {
  if (hour === 24) return "24:00";
  return `${String(hour).padStart(2, "0")}:00`;
}

export function getLaneSpan(item: PositionedWeekEvent, group: EventGroup): number {
  let span = 1;
  for (let lane = item.lane + 1; lane < group.laneCount; lane++) {
    const blocked = group.items.some(
      (other) =>
        other.event.id !== item.event.id &&
        other.lane === lane &&
        other.startMinutes < item.endMinutes &&
        other.endMinutes > item.startMinutes,
    );
    if (blocked) break;
    span++;
  }
  return span;
}

/**
 * Groups overlapping weekly events and assigns lanes using a greedy
 * interval-layout approach.
 *
 * Events are sorted by start/end time, then packed into groups where each
 * event receives the first available lane that does not overlap with the
 * preceding item in that lane. This allows the UI to render overlapping
 * items side-by-side (similar to Google Calendar) rather than stacking them
 * vertically on top of one another.
 */
export function buildDayLayouts(events: PlannerWeekEvent[]): EventGroup[] {
  const sorted = [...events].sort((left, right) => {
    const startComparison =
      parseTimeToMinutes(left.startTime) - parseTimeToMinutes(right.startTime);

    if (startComparison !== 0) return startComparison;

    const endComparison =
      parseTimeToMinutes(left.endTime) - parseTimeToMinutes(right.endTime);

    if (endComparison !== 0) return endComparison;

    return left.title.localeCompare(right.title);
  });

  const groups: EventGroup[] = [];
  let currentGroup: PositionedWeekEvent[] = [];
  let currentGroupEnd = WEEK_START_MINUTES;

  function flushGroup() {
    if (currentGroup.length === 0) return;

    const startMinutes = Math.min(...currentGroup.map((item) => item.startMinutes));
    const endMinutes = Math.max(...currentGroup.map((item) => item.endMinutes));

    groups.push({
      startMinutes,
      endMinutes,
      laneCount: Math.max(...currentGroup.map((item) => item.lane)) + 1,
      items: currentGroup,
    });

    currentGroup = [];
    currentGroupEnd = WEEK_START_MINUTES;
  }

  for (const event of sorted) {
    const rawStartMinutes = parseTimeToMinutes(event.startTime);

    // Clamp start time to a maximum of 23:45 (WEEK_END_MINUTES - 15)
    const startMinutes = Math.min(
      WEEK_END_MINUTES - 15,
      Math.max(WEEK_START_MINUTES, rawStartMinutes),
    );
    const endMinutes = clampMinutes(
      Math.max(startMinutes + 15, parseTimeToMinutes(event.endTime)),
    );

    if (currentGroup.length > 0 && startMinutes >= currentGroupEnd) {
      flushGroup();
    }

    if (currentGroup.length === 0) {
      currentGroupEnd = endMinutes;
    } else {
      currentGroupEnd = Math.max(currentGroupEnd, endMinutes);
    }

    let lane = 0;
    const laneEndTimes = currentGroup.reduce<number[]>((accumulator, item) => {
      accumulator[item.lane] = Math.max(
        accumulator[item.lane] ?? 0,
        item.endMinutes,
      );
      return accumulator;
    }, []);

    while (laneEndTimes[lane] > startMinutes) {
      lane += 1;
    }

    currentGroup.push({ event, lane, startMinutes, endMinutes });
  }

  flushGroup();
  return groups;
}
