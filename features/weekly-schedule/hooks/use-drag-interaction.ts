"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import {
  buildDayLayouts,
  getLaneSpan,
  minutesToTime,
  parseTimeToMinutes,
  MIN_EVENT_HEIGHT,
  WEEK_START_MINUTES,
  WEEK_END_MINUTES,
  type DayLayout,
} from "@/features/weekly-schedule/lib/week-layout";
import {
  type PlannerWeekEvent,
  type PlannerWeekday,
} from "@/features/weekly-schedule/lib/week-types";

export type DragMode = "move" | "resize-start" | "resize-end";

export type DragState = {
  event: PlannerWeekEvent;
  mode: DragMode;
  offsetMinutes: number;
  duration: number;
  pointerStart: { x: number; y: number };
  isDragging: boolean;
  ghost: { top: number; left: number; width: number; height: number };
  target: { day: PlannerWeekday; startMinutes: number; endMinutes: number };
};

type UpdateWeekEvent = (id: string, update: Omit<PlannerWeekEvent, "id">) => void;

type UseDragInteractionOptions = {
  bodyRef: RefObject<HTMLDivElement | null>;
  minuteScale: number;
  displayStartMinutes: number;
  visibleDays: PlannerWeekday[];
  eventsByDay: Record<PlannerWeekday, PlannerWeekEvent[]>;
  updateWeekEvent: UpdateWeekEvent;
  onEventClick: (event: PlannerWeekEvent) => void;
};

export function useDragInteraction({
  bodyRef,
  minuteScale,
  displayStartMinutes,
  visibleDays,
  eventsByDay,
  updateWeekEvent,
  onEventClick,
}: UseDragInteractionOptions) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Keep latest values accessible inside stable mouse-event callbacks
  const minuteScaleRef = useRef(minuteScale);
  const displayStartMinutesRef = useRef(displayStartMinutes);
  const visibleDaysRef = useRef(visibleDays);
  const updateWeekEventRef = useRef(updateWeekEvent);
  const onEventClickRef = useRef(onEventClick);
  useLayoutEffect(() => {
    minuteScaleRef.current = minuteScale;
    displayStartMinutesRef.current = displayStartMinutes;
    visibleDaysRef.current = visibleDays;
    updateWeekEventRef.current = updateWeekEvent;
    onEventClickRef.current = onEventClick;
  });

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
      if (item) {
        return { lane: item.lane, laneCount: group.laneCount, span: getLaneSpan(item, group) };
      }
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
      target: { day: event.day, startMinutes: eventStart, endMinutes: eventEnd },
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
        const moveSnapped =
          Math.round((relY / scale + startMin - state.offsetMinutes) / 15) * 15;
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
        ghostHeight = Math.max(MIN_EVENT_HEIGHT, (targetEnd - targetStart) * scale);
      } else {
        targetEnd = Math.max(
          state.target.startMinutes + 15,
          Math.min(WEEK_END_MINUTES, snapped),
        );
        ghostHeight = Math.max(MIN_EVENT_HEIGHT, (targetEnd - targetStart) * scale);
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
        onEventClickRef.current(state.event);
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
    // bodyRef is a stable ref object; all mutable values are read via refs updated in useLayoutEffect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (drag?.isDragging) {
      document.body.style.cursor = drag.mode === "move" ? "grabbing" : "ns-resize";
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

  return { drag, draggingLayouts, ghostLaneInfo, handleInteractionMouseDown };
}
