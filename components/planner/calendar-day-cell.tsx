"use client";

import { useDroppable } from "@dnd-kit/core";

import { DraggableEvent } from "@/components/planner/draggable-event";
import type { PlannerEvent } from "@/lib/planner";

type CalendarDayCellProps = {
  day: number;
  dateKey: string;
  events: PlannerEvent[];
};

export function CalendarDayCell({
  day,
  dateKey,
  events,
}: CalendarDayCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `date:${dateKey}`,
    data: {
      dateKey,
      targetType: "date",
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`group flex h-24 flex-col rounded-2xl border px-2 py-2 transition-colors ${
        isOver
          ? "border-slate-900 bg-slate-100"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-500">{day}</span>
        {events.length > 0 ? (
          <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {events.length}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-1 flex-col gap-1 overflow-hidden">
        {events.slice(0, 2).map((event) => (
          <DraggableEvent key={event.id} event={event} compact />
        ))}
        {events.length > 2 ? (
          <div className="text-[11px] text-slate-400">
            +{events.length - 2} more
          </div>
        ) : null}
      </div>
    </div>
  );
}
