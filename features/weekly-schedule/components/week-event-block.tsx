"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { getWeekTheme } from "@/features/weekly-schedule/lib/week-category-config";
import {
  getLaneSpan,
  MIN_EVENT_HEIGHT,
  TITLE_LINE_PX,
  PARTICIPANT_LINE_PX,
  type EventGroup,
} from "@/features/weekly-schedule/lib/week-layout";
import {
  type PlannerWeekEvent,
  type PlannerWeekday,
} from "@/features/weekly-schedule/lib/week-types";
import type { DragMode } from "@/features/weekly-schedule/hooks/use-drag-interaction";

export function WeekEventContent({
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

  // How many title lines fit: if participants are shown, reserve space for at
  // least one participant line + the gap (2px space-y-0.5); otherwise fill all.
  const titleLines = hasParticipants
    ? Math.max(1, Math.floor((available - 2 - PARTICIPANT_LINE_PX) / TITLE_LINE_PX))
    : Math.max(1, Math.floor(available / TITLE_LINE_PX));

  // Participants fill whatever space remains after the title.
  const remaining = available - titleLines * TITLE_LINE_PX - 2;
  const participantLines =
    hasParticipants && remaining >= PARTICIPANT_LINE_PX
      ? Math.max(1, Math.floor(remaining / PARTICIPANT_LINE_PX))
      : 0;

  const titleRef = useRef<HTMLDivElement>(null);
  const [singleLine, setSingleLine] = useState(false);

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const overflows = el.scrollWidth > el.clientWidth;
    if (overflows !== singleLine) setSingleLine(overflows);
  }, [singleLine, titleLines, event.title]);

  return (
    <div className="min-w-0 flex-1 space-y-0.5">
      <div
        ref={titleRef}
        className="text-[10px] font-semibold leading-tight"
        style={
          singleLine
            ? { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
            : {
                display: "-webkit-box",
                WebkitLineClamp: titleLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
        }
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

export function WeekDayColumn({
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
          const groupTop = (group.startMinutes - displayStartMinutes) * minuteScale;
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
                const top = (item.startMinutes - group.startMinutes) * minuteScale;
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
                    className={`absolute flex items-start min-w-0 cursor-grab select-none overflow-hidden rounded-md border px-1 py-px text-left shadow-[0_8px_18px_rgba(15,23,42,0.08)] ${item.event.id === draggingEventId ? "opacity-0 pointer-events-none" : "transition-transform hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)]"} ${theme.card}`}
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
                        const rect = (
                          e.currentTarget.parentElement as HTMLElement
                        ).getBoundingClientRect();
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
                        const rect = (
                          e.currentTarget.parentElement as HTMLElement
                        ).getBoundingClientRect();
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
