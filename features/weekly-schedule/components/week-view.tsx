"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { createPortal } from "react-dom";

import { PlannerWeekEventForm } from "@/features/weekly-schedule/components/week-event-form";
import { WeekDayColumn, WeekEventContent } from "@/features/weekly-schedule/components/week-event-block";
import { EventPreviewModal } from "@/components/ui/event-preview";
import { getDefaultWeekAppointmentTimeRange } from "@/components/ui/time-picker";
import {
  plannerWeekdays,
  type PlannerWeekEvent,
  type PlannerWeekday,
} from "@/features/weekly-schedule/lib/week-types";
import {
  buildDayLayouts,
  formatHourLabel,
  parseTimeToMinutes,
  MIN_EVENT_HEIGHT,
  DEFAULT_DISPLAY_START,
  DEFAULT_DISPLAY_END,
  WEEK_START_MINUTES,
  WEEK_END_MINUTES,
  type DayLayout,
} from "@/features/weekly-schedule/lib/week-layout";
import { getWeekTheme } from "@/features/weekly-schedule/lib/week-category-config";
import { useFriendsState } from "@/features/friends/state/friends-state";
import { usePlannerState } from "@/features/planner/state/planner-state";
import { useFilterState } from "@/features/planner/state/filter-state";
import { useMeasuredHeight } from "@/features/weekly-schedule/hooks/use-measured-height";
import { useDragInteraction } from "@/features/weekly-schedule/hooks/use-drag-interaction";

export function WeekView() {
  const { weekEvents, updateWeekEvent, deleteWeekEvent } = usePlannerState();
  const { applyWeekFilters } = useFilterState();
  const { friendNames } = useFriendsState();
  const visibleWeekEvents = applyWeekFilters(weekEvents);
  const { ref: bodyRef, height: bodyHeight } = useMeasuredHeight<HTMLDivElement>();
  const [previewEvent, setPreviewEvent] = useState<PlannerWeekEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<PlannerWeekEvent | null>(null);

  // Compute the visible time range: default 08:00–18:00, expanded to the
  // nearest hour boundary whenever events fall outside that window.
  const { displayStartMinutes, displayEndMinutes } = useMemo(() => {
    if (visibleWeekEvents.length === 0) {
      return { displayStartMinutes: DEFAULT_DISPLAY_START, displayEndMinutes: DEFAULT_DISPLAY_END };
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

  const eventsByDay = useMemo(() => {
    return plannerWeekdays.reduce<Record<PlannerWeekday, PlannerWeekEvent[]>>(
      (accumulator, day) => {
        accumulator[day] = visibleWeekEvents.filter((event) => event.day === day);
        return accumulator;
      },
      { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] },
    );
  }, [visibleWeekEvents]);

  const layouts = useMemo(() => {
    return plannerWeekdays.reduce<Record<PlannerWeekday, DayLayout>>(
      (accumulator, day) => {
        accumulator[day] = { groups: buildDayLayouts(eventsByDay[day] ?? []) };
        return accumulator;
      },
      {
        Mon: { groups: [] }, Tue: { groups: [] }, Wed: { groups: [] },
        Thu: { groups: [] }, Fri: { groups: [] }, Sat: { groups: [] }, Sun: { groups: [] },
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

  const { drag, draggingLayouts, ghostLaneInfo, handleInteractionMouseDown } =
    useDragInteraction({
      bodyRef,
      minuteScale,
      displayStartMinutes,
      visibleDays,
      eventsByDay,
      updateWeekEvent,
      onEventClick: setPreviewEvent,
    });

  useEffect(() => {
    if (!previewEvent) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPreviewEvent(null);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [previewEvent]);

  function handleSubmitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEvent) return;

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
      {/* Day header row */}
      <div
        className="grid border-b border-sam-border bg-slate-50/90 text-sam-text-3 dark:bg-slate-800/90"
        style={{ gridTemplateColumns: `4rem repeat(${visibleDays.length}, minmax(0, 1fr))` }}
      >
        <div className="flex items-center justify-center border-r border-sam-border px-1.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-sam-text-4">
          Time
        </div>
        {visibleDays.map((day) => (
          <div
            key={day}
            className="flex items-center justify-center border-r border-sam-border px-1.5 py-2.5 last:border-r-0"
          >
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-sam-text-2">
              {day}
            </div>
          </div>
        ))}
      </div>

      {/* Grid body: time column + day columns */}
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
                  hour === displayEndMinutes / 60 ? "font-semibold text-slate-700" : ""
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

      {/* Portals: preview modal, edit form, drag ghost */}
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
                  (drag.target.endMinutes - drag.target.startMinutes) * minuteScale
                }
              />
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
