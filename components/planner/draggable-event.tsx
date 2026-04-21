"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { EventBadge } from "@/components/planner/event-badge";
import type { PlannerEvent } from "@/lib/planner";

type DraggableEventProps = {
  event: PlannerEvent;
  compact?: boolean;
  children?: React.ReactNode;
};

export function DraggableEvent({
  event,
  compact = false,
  children,
}: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `event:${event.id}`,
      data: {
        eventId: event.id,
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`touch-none cursor-grab truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] leading-4 text-slate-700 active:cursor-grabbing ${
          isDragging ? "opacity-40" : "opacity-100"
        }`}
      >
        {event.title}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`touch-none cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
    >
      {children ?? <EventBadge event={event} />}
    </div>
  );
}
