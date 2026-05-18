"use client";

/**
 * Primary layout engine for the Weekly Routine domain.
 *
 * This component renders the responsive time-grid for the weekly schedule
 * and calculates how overlapping events should be arranged into lanes so
 * they can be displayed side-by-side instead of stacked on top of each other.
 */

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";

import { PlannerWeekEventForm } from "@/features/weekly-schedule/components/week-event-form";
import { EventPreviewModal } from "@/components/ui/event-preview";
import { getDefaultWeekAppointmentTimeRange } from "@/components/ui/time-picker";
import {
  plannerWeekdays,
  type PlannerWeekEvent,
  type PlannerWeekday,
} from "@/features/weekly-schedule/lib/week-types";
import { getWeekTheme } from "@/features/weekly-schedule/lib/week-category-config";
import { useFriendsState } from "@/features/friends/state/friends-state";
import { usePlannerState } from "@/features/planner/state/planner-state";
import { useFilterState } from "@/features/planner/state/filter-state";

type DayLayout = {
  groups: EventGroup[];
};

type EventGroup = {
  startMinutes: number;
  endMinutes: number;
  laneCount: number;
  items: PositionedWeekEvent[];
};

type PositionedWeekEvent = {
  event: PlannerWeekEvent;
  lane: number;
  startMinutes: number;
  endMinutes: number;
};

const WEEK_START_MINUTES = 6 * 60;
const WEEK_END_MINUTES = 24 * 60;
const MIN_EVENT_HEIGHT = 42;
// Default visible range: 08:00–18:00. Extended automatically when events
// fall outside this window; never exceeds WEEK_START/END_MINUTES.
const DEFAULT_DISPLAY_START = 8 * 60;
const DEFAULT_DISPLAY_END = 18 * 60;
// leading-tight at the respective font sizes, used to compute how many
// participant lines fit in the remaining block height.
const TITLE_LINE_PX = 13; // leading-tight at text-[10px]
const PARTICIPANT_LINE_PX = 11; // leading-tight at text-[8.5px]

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

type DragMode = "move" | "resize-start" | "resize-end";

type DragState = {
  event: PlannerWeekEvent;
  mode: DragMode;
  offsetMinutes: number;
  duration: number;
  pointerStart: { x: number; y: number };
  isDragging: boolean;
  ghost: { top: number; left: number; width: number; height: number };
  target: { day: PlannerWeekday; startMinutes: number; endMinutes: number };
};

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return WEEK_START_MINUTES;
  }
  return hours * 60 + minutes;
}

function clampMinutes(minutes: number) {
  return Math.min(WEEK_END_MINUTES, Math.max(WEEK_START_MINUTES, minutes));
}

function formatHourLabel(hour: number) {
  if (hour === 24) {
    return "24:00";
  }

  return `${String(hour).padStart(2, "0")}:00`;
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
function buildDayLayouts(events: PlannerWeekEvent[]) {
  const sorted = [...events].sort((left, right) => {
    const startComparison =
      parseTimeToMinutes(left.startTime) - parseTimeToMinutes(right.startTime);

    if (startComparison !== 0) {
      return startComparison;
    }

    const endComparison =
      parseTimeToMinutes(left.endTime) - parseTimeToMinutes(right.endTime);

    if (endComparison !== 0) {
      return endComparison;
    }

    return left.title.localeCompare(right.title);
  });

  const groups: EventGroup[] = [];
  let currentGroup: PositionedWeekEvent[] = [];
  let currentGroupEnd = WEEK_START_MINUTES;

  function flushGroup() {
    if (currentGroup.length === 0) {
      return;
    }

    const startMinutes = Math.min(
      ...currentGroup.map((item) => item.startMinutes),
    );
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

    currentGroup.push({
      event,
      lane,
      startMinutes,
      endMinutes,
    });
  }

  flushGroup();
  return groups;
}

function getLaneSpan(item: PositionedWeekEvent, group: EventGroup): number {
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
 * Measures the grid container so the responsive time scale can track the
 * available viewport height.
 *
 * The weekly grid uses this measurement to convert the fixed timeline into
 * exact pixel values as the browser resizes.
 */
function useMeasuredHeight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }

    const element = ref.current;
    const updateHeight = () => {
      setHeight(element.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, height };
}

function WeekEventContent({
  event,
  height,
  naturalHeight,
}: {
  event: PlannerWeekEvent;
  height: number;
  naturalHeight: number;
}) {
  const hasParticipants =
    naturalHeight >= MIN_EVENT_HEIGHT && event.participants.length > 0;

  const available = height - 2; // py-px: 1px top + 1px bottom

  let titleLines: number;
  let participantLines = 0;

  if (hasParticipants) {
    const titleHeight = Math.floor(available * 0.6);
    const participantHeight = available - titleHeight - 2; // 2px space-y-0.5 gap
    if (participantHeight >= PARTICIPANT_LINE_PX) {
      titleLines = Math.max(1, Math.floor(titleHeight / TITLE_LINE_PX));
      participantLines = Math.max(1, Math.floor(participantHeight / PARTICIPANT_LINE_PX));
    } else {
      titleLines = Math.max(1, Math.floor(available / TITLE_LINE_PX));
    }
  } else {
    titleLines = Math.max(1, Math.floor(available / TITLE_LINE_PX));
  }

  return (
    <div className="min-w-0 flex-1 space-y-0.5">
      <div
        className="text-[10px] font-semibold leading-tight"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: titleLines,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {event.title}
      </div>
      {participantLines > 0 && (
        <div
          className="text-[8.5px] font-medium leading-tight opacity-65"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: participantLines,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {event.participants.join(" · ")}
        </div>
      )}
    </div>
  );
}

function WeekDayColumn({
  day,
  groups,
  minuteScale,
  displayStartMinutes,
  onInteractionMouseDown,
  draggingEventId,

}: {
  day: PlannerWeekday;
  groups: EventGroup[];
  minuteScale: number;
  displayStartMinutes: number;
  onInteractionMouseDown: (
    event: PlannerWeekEvent,
    mode: DragMode,
    e: React.MouseEvent<HTMLElement>,
    blockRect: DOMRect,
  ) => void;
  draggingEventId?: string;

}) {
  return (
    <div className="relative border-r border-sam-border last:border-r-0">
      <div className="relative h-full min-h-0" style={{ minHeight: 1 }}>
        <div
          className="absolute inset-0"
          style={
            {
              backgroundImage:
                "repeating-linear-gradient(to bottom, rgba(148,163,184,0.18) 0, rgba(148,163,184,0.18) 1px, transparent 1px, transparent calc(var(--slot-height)))",
              ["--slot-height" as never]: `${60 * minuteScale}px`,
            } as CSSProperties
          }
        />

{groups.map((group, groupIndex) => {
          const groupTop =
            (group.startMinutes - displayStartMinutes) * minuteScale;
          const groupHeight = Math.max(
            MIN_EVENT_HEIGHT,
            (group.endMinutes - group.startMinutes) * minuteScale,
          );
          const laneWidth = 100 / group.laneCount;

          return (
            <div
              key={`${day}-${groupIndex}`}
              className="absolute inset-x-0"
              style={{ top: `${groupTop}px`, height: `${groupHeight}px` }}
            >
              {group.items.map((item) => {
                const top =
                  (item.startMinutes - group.startMinutes) * minuteScale;
                const naturalHeight =
                  (item.endMinutes - item.startMinutes) * minuteScale;
                const height = Math.max(MIN_EVENT_HEIGHT, naturalHeight);
                const span = getLaneSpan(item, group);
                const theme = getWeekTheme(item.event.category);

                return (
                  <button
                    key={item.event.id}
                    type="button"
                    title={item.event.title}
                    onMouseDown={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      onInteractionMouseDown(item.event, "move", e, rect);
                    }}
                    className={`absolute flex items-center min-w-0 cursor-grab select-none overflow-hidden rounded-md border px-1 py-px text-left shadow-[0_8px_18px_rgba(15,23,42,0.08)] ${item.event.id === draggingEventId ? "opacity-0 pointer-events-none" : "transition-transform hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)]"} ${theme.card}`}
                    style={{
                      top: `${top}px`,
                      left: `${item.lane * laneWidth}%`,
                      width: `${laneWidth * span}%`,
                      height: `${height}px`,
                    }}
                  >
                    <div
                      className="absolute inset-x-0 top-0 h-2 cursor-ns-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                        onInteractionMouseDown(item.event, "resize-start", e, rect);
                      }}
                    />
                    <WeekEventContent
                      event={item.event}
                      height={height}
                      naturalHeight={naturalHeight}
                    />
                    <div
                      className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                        onInteractionMouseDown(item.event, "resize-end", e, rect);
                      }}
                    />
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WeekView() {
  const { weekEvents, updateWeekEvent, deleteWeekEvent } = usePlannerState();
  const { applyWeekFilters } = useFilterState();
  const { friendNames } = useFriendsState();
  const visibleWeekEvents = applyWeekFilters(weekEvents);
  const { ref: bodyRef, height: bodyHeight } =
    useMeasuredHeight<HTMLDivElement>();
  const [previewEvent, setPreviewEvent] = useState<PlannerWeekEvent | null>(
    null,
  );
  const [editingEvent, setEditingEvent] = useState<PlannerWeekEvent | null>(
    null,
  );

  // Compute the visible time range: default 08:00–18:00, expanded to the
  // nearest hour boundary whenever events fall outside that window.
  const { displayStartMinutes, displayEndMinutes } = useMemo(() => {
    if (visibleWeekEvents.length === 0) {
      return {
        displayStartMinutes: DEFAULT_DISPLAY_START,
        displayEndMinutes: DEFAULT_DISPLAY_END,
      };
    }
    const earliestStart = Math.min(
      ...visibleWeekEvents.map((e) => parseTimeToMinutes(e.startTime)),
    );
    const latestEnd = Math.max(
      ...visibleWeekEvents.map((e) => parseTimeToMinutes(e.endTime)),
    );
    return {
      displayStartMinutes: Math.max(
        WEEK_START_MINUTES,
        Math.floor(Math.min(earliestStart, DEFAULT_DISPLAY_START) / 60) * 60,
      ),
      displayEndMinutes: Math.min(
        WEEK_END_MINUTES,
        Math.ceil(Math.max(latestEnd, DEFAULT_DISPLAY_END) / 60) * 60,
      ),
    };
  }, [visibleWeekEvents]);

  const displayHourCount = (displayEndMinutes - displayStartMinutes) / 60;

  const minuteScale =
    bodyHeight > 0 ? bodyHeight / (displayEndMinutes - displayStartMinutes) : 1.0;

  useEffect(() => {
    if (!previewEvent) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewEvent(null);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [previewEvent]);

  const eventsByDay = useMemo(() => {
    return plannerWeekdays.reduce<Record<PlannerWeekday, PlannerWeekEvent[]>>(
      (accumulator, day) => {
        accumulator[day] = visibleWeekEvents.filter(
          (event) => event.day === day,
        );
        return accumulator;
      },
      {
        Mon: [],
        Tue: [],
        Wed: [],
        Thu: [],
        Fri: [],
        Sat: [],
        Sun: [],
      },
    );
  }, [visibleWeekEvents]);

  const layouts = useMemo(() => {
    return plannerWeekdays.reduce<Record<PlannerWeekday, DayLayout>>(
      (accumulator, day) => {
        accumulator[day] = {
          groups: buildDayLayouts(eventsByDay[day] ?? []),
        };
        return accumulator;
      },
      {
        Mon: { groups: [] },
        Tue: { groups: [] },
        Wed: { groups: [] },
        Thu: { groups: [] },
        Fri: { groups: [] },
        Sat: { groups: [] },
        Sun: { groups: [] },
      },
    );
  }, [eventsByDay]);

  const visibleDays = useMemo(() => {
    const sunVisible = (eventsByDay["Sun"]?.length ?? 0) > 0;
    return plannerWeekdays.filter((day) => {
      if (day === "Sun") return sunVisible;
      if (day === "Sat") return (eventsByDay["Sat"]?.length ?? 0) > 0 || sunVisible;
      return true;
    });
  }, [eventsByDay]);

  const updateWeekEventRef = useRef(updateWeekEvent);
  updateWeekEventRef.current = updateWeekEvent;
  const setPreviewEventRef = useRef(setPreviewEvent);
  setPreviewEventRef.current = setPreviewEvent;

  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const minuteScaleRef = useRef(minuteScale);
  minuteScaleRef.current = minuteScale;
  const displayStartMinutesRef = useRef(displayStartMinutes);
  displayStartMinutesRef.current = displayStartMinutes;
  const visibleDaysRef = useRef(visibleDays);
  visibleDaysRef.current = visibleDays;

  // Hypothetical layouts that include the ghost event so other events in the
  // target column immediately adjust their lane widths during drag/resize.
  const draggingLayouts = useMemo(() => {
    if (!drag?.isDragging) return null;
    const { event: dragged, target } = drag;

    const ghostEvent: PlannerWeekEvent = {
      ...dragged,
      day: target.day,
      startTime: minutesToTime(target.startMinutes),
      endTime: minutesToTime(target.endMinutes),
    };

    const result: Partial<Record<PlannerWeekday, DayLayout>> = {};

    if (dragged.day !== target.day) {
      result[dragged.day] = {
        groups: buildDayLayouts(
          (eventsByDay[dragged.day] ?? []).filter((e) => e.id !== dragged.id),
        ),
      };
    }

    result[target.day] = {
      groups: buildDayLayouts([
        ...(eventsByDay[target.day] ?? []).filter((e) => e.id !== dragged.id),
        ghostEvent,
      ]),
    };

    return result;
  }, [drag, eventsByDay]);

  const ghostLaneInfo = useMemo(() => {
    if (!drag?.isDragging || !draggingLayouts) return null;
    const targetGroups = draggingLayouts[drag.target.day]?.groups ?? [];
    for (const group of targetGroups) {
      const item = group.items.find((i) => i.event.id === drag.event.id);
      if (item) return { lane: item.lane, laneCount: group.laneCount, span: getLaneSpan(item, group) };
    }
    return null;
  }, [drag, draggingLayouts]);

  function handleInteractionMouseDown(
    event: PlannerWeekEvent,
    mode: DragMode,
    e: React.MouseEvent<HTMLElement>,
    blockRect: DOMRect,
  ) {
    e.preventDefault();
    if (!bodyRef.current || minuteScale === 0) return;

    const gridRect = bodyRef.current.getBoundingClientRect();
    const dayColWidth = (gridRect.width - 64) / visibleDays.length;
    const eventStart = parseTimeToMinutes(event.startTime);
    const eventEnd = parseTimeToMinutes(event.endTime);
    const eventDuration = eventEnd - eventStart;
    const clickYInBlock = e.clientY - blockRect.top;
    const offsetMinutes = Math.max(
      0,
      Math.min(eventDuration, clickYInBlock / minuteScale),
    );
    const dayIndex = visibleDays.indexOf(event.day);

    dragRef.current = {
      event,
      mode,
      offsetMinutes,
      duration: eventDuration,
      pointerStart: { x: e.clientX, y: e.clientY },
      isDragging: false,
      ghost: {
        top: blockRect.top,
        left: gridRect.left + 64 + dayIndex * dayColWidth,
        width: dayColWidth,
        height: Math.max(MIN_EVENT_HEIGHT, eventDuration * minuteScale),
      },
      target: {
        day: event.day,
        startMinutes: eventStart,
        endMinutes: eventEnd,
      },
    };
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const state = dragRef.current;
      if (!state || !bodyRef.current) return;

      const dx = e.clientX - state.pointerStart.x;
      const dy = e.clientY - state.pointerStart.y;
      if (!state.isDragging && Math.hypot(dx, dy) < 5) return;

      const gridRect = bodyRef.current.getBoundingClientRect();
      const days = visibleDaysRef.current;
      const scale = minuteScaleRef.current;
      const startMin = displayStartMinutesRef.current;
      const dayColWidth = (gridRect.width - 64) / days.length;
      const relY = e.clientY - gridRect.top;
      const rawMinutes = relY / scale + startMin;
      const snapped = Math.round(rawMinutes / 15) * 15;

      let targetDay = state.target.day;
      let targetStart = state.target.startMinutes;
      let targetEnd = state.target.endMinutes;
      let ghostTop = state.ghost.top;
      let ghostLeft = state.ghost.left;
      let ghostHeight = state.ghost.height;

      if (state.mode === "move") {
        const relX = e.clientX - gridRect.left - 64;
        const dayIndex = Math.max(
          0,
          Math.min(days.length - 1, Math.floor(relX / dayColWidth)),
        );
        targetDay = days[dayIndex];
        const moveSnapped = Math.round(
          (relY / scale + startMin - state.offsetMinutes) / 15,
        ) * 15;
        targetStart = Math.max(
          WEEK_START_MINUTES,
          Math.min(WEEK_END_MINUTES - state.duration, moveSnapped),
        );
        targetEnd = targetStart + state.duration;
        ghostTop = gridRect.top + (targetStart - startMin) * scale;
        ghostLeft = gridRect.left + 64 + dayIndex * dayColWidth;
      } else if (state.mode === "resize-start") {
        targetStart = Math.max(
          WEEK_START_MINUTES,
          Math.min(state.target.endMinutes - 15, snapped),
        );
        ghostTop = gridRect.top + (targetStart - startMin) * scale;
        ghostHeight = Math.max(
          MIN_EVENT_HEIGHT,
          (targetEnd - targetStart) * scale,
        );
      } else {
        targetEnd = Math.max(
          state.target.startMinutes + 15,
          Math.min(WEEK_END_MINUTES, snapped),
        );
        ghostHeight = Math.max(
          MIN_EVENT_HEIGHT,
          (targetEnd - targetStart) * scale,
        );
      }

      const updated: DragState = {
        ...state,
        isDragging: true,
        ghost: { ...state.ghost, top: ghostTop, left: ghostLeft, height: ghostHeight },
        target: { day: targetDay, startMinutes: targetStart, endMinutes: targetEnd },
      };

      dragRef.current = updated;
      setDrag({ ...updated });
    }

    function onMouseUp() {
      const state = dragRef.current;
      if (!state) return;

      if (state.isDragging) {
        const { event, target } = state;
        updateWeekEventRef.current(event.id, {
          title: event.title,
          description: event.description,
          category: event.category,
          day: target.day,
          startTime: minutesToTime(target.startMinutes),
          endTime: minutesToTime(target.endMinutes),
          participants: event.participants,
        });
      } else if (state.mode === "move") {
        setPreviewEventRef.current(state.event);
      }

      dragRef.current = null;
      setDrag(null);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (drag?.isDragging) {
      document.body.style.cursor =
        drag.mode === "move" ? "grabbing" : "ns-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [drag?.isDragging, drag?.mode]);

  function handleSubmitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingEvent) {
      return;
    }

    const normalizedRange = getDefaultWeekAppointmentTimeRange(
      editingEvent.startTime,
      editingEvent.endTime,
    );

    updateWeekEvent(editingEvent.id, {
      title: editingEvent.title,
      description: editingEvent.description,
      category: editingEvent.category,
      day: editingEvent.day,
      startTime: normalizedRange.startTime,
      endTime: normalizedRange.endTime,
      participants: editingEvent.participants,
    });

    setPreviewEvent(editingEvent);
    setEditingEvent(null);
  }

  return (
    <section className="flex min-h-full flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-sam-surface/90 shadow-[0_1px_0_rgba(15,23,42,0.04),0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-700/70 dark:shadow-[0_1px_0_rgba(0,0,0,0.2),0_18px_48px_rgba(0,0,0,0.3)]">
      <div
        className="grid border-b border-sam-border bg-slate-50/90 text-sam-text-3 dark:bg-slate-800/90"
        style={{ gridTemplateColumns: `4rem repeat(${visibleDays.length}, minmax(0, 1fr))` }}
      >
        <div className="flex items-center justify-center border-r border-sam-border px-1.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-sam-text-4">
          Time
        </div>
        {visibleDays.map((day) => {
          return (
            <div
              key={day}
              className="flex items-center justify-center border-r border-sam-border px-1.5 py-2.5 last:border-r-0"
            >
              <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-sam-text-2">
                {day}
              </div>
            </div>
          );
        })}
      </div>

      <div
        ref={bodyRef}
        className="grid flex-1 overflow-hidden"
        style={{
          gridTemplateColumns: `4rem repeat(${visibleDays.length}, minmax(0, 1fr))`,
          minHeight: displayHourCount * MIN_EVENT_HEIGHT,
        }}
      >
        <div className="relative border-r border-sam-border bg-slate-50/80 dark:bg-slate-800/60">
          <div
            className="absolute inset-0"
            style={
              {
                backgroundImage:
                  "repeating-linear-gradient(to bottom, rgba(148,163,184,0.18) 0, rgba(148,163,184,0.18) 1px, transparent 1px, transparent calc(var(--slot-height)))",
                ["--slot-height" as never]: `${60 * minuteScale}px`,
              } as CSSProperties
            }
          />
          {Array.from(
            { length: displayHourCount + 1 },
            (_, index) => displayStartMinutes / 60 + index,
          ).map((hour) => (
            <div
              key={hour}
              style={{ height: `calc(100% / ${displayHourCount})` }}
              className="relative flex items-center justify-center text-[9px] font-medium text-sam-text-3"
            >
              <span
                className={
                  hour === displayEndMinutes / 60
                    ? "font-semibold text-slate-700"
                    : ""
                }
              >
                {formatHourLabel(hour)}
              </span>
            </div>
          ))}
        </div>

        {visibleDays.map((day) => (
          <WeekDayColumn
            key={day}
            day={day}
            groups={(draggingLayouts?.[day] ?? layouts[day]).groups}
            minuteScale={minuteScale}
            displayStartMinutes={displayStartMinutes}
            onInteractionMouseDown={handleInteractionMouseDown}
            draggingEventId={drag?.isDragging ? drag.event.id : undefined}

          />
        ))}
      </div>

      {previewEvent && typeof document !== "undefined"
        ? createPortal(
            <EventPreviewModal
              heading="Weekly appointment details"
              event={previewEvent}
              onEdit={() => {
                setEditingEvent(previewEvent);
                setPreviewEvent(null);
              }}
              onDelete={() => {
                deleteWeekEvent(previewEvent.id);
                setPreviewEvent(null);
              }}
              onClose={() => setPreviewEvent(null)}
            />,
            document.body,
          )
        : null}

      {editingEvent && typeof document !== "undefined"
        ? createPortal(
            <PlannerWeekEventForm
              heading="Edit weekly appointment"
              submitLabel="Save changes"
              title={editingEvent.title}
              description={editingEvent.description ?? ""}
              category={editingEvent.category}
              day={editingEvent.day}
              startTime={editingEvent.startTime}
              endTime={editingEvent.endTime}
              participants={editingEvent.participants}
              availableParticipants={friendNames}
              onTitleChange={(value) =>
                setEditingEvent((current) =>
                  current ? { ...current, title: value } : current,
                )
              }
              onDescriptionChange={(value) =>
                setEditingEvent((current) =>
                  current ? { ...current, description: value } : current,
                )
              }
              onCategoryChange={(value) =>
                setEditingEvent((current) =>
                  current ? { ...current, category: value } : current,
                )
              }
              onDayChange={(value) =>
                setEditingEvent((current) =>
                  current ? { ...current, day: value } : current,
                )
              }
              onStartTimeChange={(value) =>
                setEditingEvent((current) =>
                  current ? { ...current, startTime: value } : current,
                )
              }
              onEndTimeChange={(value) =>
                setEditingEvent((current) =>
                  current ? { ...current, endTime: value } : current,
                )
              }
              onParticipantsChange={(value) =>
                setEditingEvent((current) =>
                  current ? { ...current, participants: value } : current,
                )
              }
              onSubmit={handleSubmitEdit}
              onCancel={() => setEditingEvent(null)}
            />,
            document.body,
          )
        : null}
      {drag?.isDragging && typeof document !== "undefined"
        ? createPortal(
            <div
              style={{
                position: "fixed",
                top: drag.ghost.top,
                left: ghostLaneInfo
                  ? drag.ghost.left +
                    ghostLaneInfo.lane * (drag.ghost.width / ghostLaneInfo.laneCount)
                  : drag.ghost.left,
                width: ghostLaneInfo
                  ? (drag.ghost.width / ghostLaneInfo.laneCount) * ghostLaneInfo.span
                  : drag.ghost.width,
                height: drag.ghost.height,
                pointerEvents: "none",
                zIndex: 9999,
              }}
              className={`flex items-center overflow-hidden rounded-md border px-1 py-px shadow-[0_8px_18px_rgba(15,23,42,0.08)] ${getWeekTheme(drag.event.category).card}`}
            >
              <WeekEventContent
                event={drag.event}
                height={drag.ghost.height}
                naturalHeight={
                  (drag.target.endMinutes - drag.target.startMinutes) *
                  minuteScale
                }
              />
            </div>,
            document.body,
          )
        : null}

    </section>
  );
}
