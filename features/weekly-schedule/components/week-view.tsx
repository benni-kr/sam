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

function WeekDayColumn({
  day,
  groups,
  minuteScale,
  onEdit,
}: {
  day: PlannerWeekday;
  groups: EventGroup[];
  minuteScale: number;
  onEdit: (event: PlannerWeekEvent) => void;
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
            (group.startMinutes - WEEK_START_MINUTES) * minuteScale;
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
                const height = Math.max(
                  MIN_EVENT_HEIGHT,
                  (item.endMinutes - item.startMinutes) * minuteScale,
                );
                const theme = getWeekTheme(item.event.category);

                // Logic variables kept so you can easily toggle them later
                //const showTime = height >= 52 && group.laneCount <= 2;
                const showParticipants = height >= 52 && group.laneCount <= 2;

                return (
                  <button
                    key={item.event.id}
                    type="button"
                    onClick={() => onEdit(item.event)}
                    className={`absolute min-w-0 overflow-hidden rounded-md border px-1.5 py-0.5 text-left shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)] ${theme.card}`}
                    style={{
                      top: `${top}px`,
                      left: `${item.lane * laneWidth}%`,
                      width: `${laneWidth}%`,
                      height: `${height}px`,
                    }}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="line-clamp-2 text-[10px] font-semibold leading-3.5">
                        {item.event.title}
                      </div>

                      {/* Commented out the time display block below */}
                      {/* 
                      {showTime ? (
                        <div className="truncate text-[8.5px] font-medium leading-3.5 opacity-75">
                          {item.event.startTime} - {item.event.endTime}
                        </div>
                      ) : null} 
                      */}

                      {showParticipants ? (
                        <div className="min-w-0 text-[8.5px] font-medium leading-3.5 opacity-65">
                          <span className="whitespace-normal break-words">
                            {item.event.participants.join(" · ") ||
                              "No participants"}
                          </span>
                        </div>
                      ) : null}
                    </div>
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
  const { friendNames } = useFriendsState();
  const { ref: bodyRef, height: bodyHeight } =
    useMeasuredHeight<HTMLDivElement>();
  const [previewEvent, setPreviewEvent] = useState<PlannerWeekEvent | null>(
    null,
  );
  const [editingEvent, setEditingEvent] = useState<PlannerWeekEvent | null>(
    null,
  );

  // Map the fixed 18-hour timeline (1080 minutes from 06:00 to 24:00) to the
  // exact pixel height of the viewport so the grid fits perfectly without
  // requiring vertical scrolling.
  const minuteScale =
    bodyHeight > 0 ? bodyHeight / (WEEK_END_MINUTES - WEEK_START_MINUTES) : 1.0;

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
        accumulator[day] = weekEvents.filter((event) => event.day === day);
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
  }, [weekEvents]);

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
      category: editingEvent.category,
      day: editingEvent.day,
      startTime: normalizedRange.startTime,
      endTime: normalizedRange.endTime,
      participants: editingEvent.participants,
    });
    setEditingEvent(null);
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-sam-surface/90 shadow-[0_1px_0_rgba(15,23,42,0.04),0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-700/70 dark:shadow-[0_1px_0_rgba(0,0,0,0.2),0_18px_48px_rgba(0,0,0,0.3)]">
      <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-sam-border bg-slate-50/90 text-sam-text-3 dark:bg-slate-800/90">
        <div className="flex items-center justify-center border-r border-sam-border px-1.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-sam-text-4">
          Time
        </div>
        {plannerWeekdays.map((day) => {
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
        className="grid min-h-0 flex-1 grid-cols-[4rem_repeat(7,minmax(0,1fr))] overflow-hidden"
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
            { length: 19 },
            (_, index) => WEEK_START_MINUTES / 60 + index,
          ).map((hour) => (
            <div
              key={hour}
              className="relative flex h-[calc(100%/18)] items-center justify-center text-[9px] font-medium text-sam-text-3"
            >
              <span
                className={hour === 24 ? "font-semibold text-slate-700" : ""}
              >
                {formatHourLabel(hour)}
              </span>
            </div>
          ))}
        </div>

        {plannerWeekdays.map((day) => (
          <WeekDayColumn
            key={day}
            day={day}
            groups={layouts[day].groups}
            minuteScale={minuteScale}
            onEdit={(event) => setPreviewEvent(event)}
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
              deleteAction={{
                label: "Delete appointment",
                prompt: "Delete this weekly appointment?",
                confirmLabel: "Delete",
                onDelete: () => {
                  deleteWeekEvent(editingEvent.id);
                  setEditingEvent(null);
                },
              }}
            />,
            document.body,
          )
        : null}
    </section>
  );
}
