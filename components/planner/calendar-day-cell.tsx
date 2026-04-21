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
      className={`group flex h-28 flex-col border-b border-r px-2 py-2 transition-colors last:border-r-0 ${
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
        {events.slice(0, 3).map((event) => (
          <EventSpanChip key={event.id} event={event} dateKey={dateKey} />
        ))}
        {events.length > 3 ? (
          <div className="text-[11px] text-slate-400">
            +{events.length - 3} more
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EventSpanChip({
  event,
  dateKey,
}: {
  event: PlannerEvent;
  dateKey: string;
}) {
  const startDate = event.startDate;
  const endDate = event.endDate ?? event.startDate;

  if (!startDate || !endDate) {
    return <DraggableEvent event={event} compact />;
  }

  const isStart = dateKey === startDate;
  const isEnd = dateKey === endDate;

  return (
    <DraggableEvent event={event}>
      <span
        className={`block truncate border px-2 py-0.5 text-[11px] leading-4 ${spanCategoryTone(event.category)} ${
          isStart ? "rounded-l-md" : "rounded-l-none"
        } ${isEnd ? "rounded-r-md" : "rounded-r-none"}`}
      >
        {isStart ? event.title : ""}
      </span>
    </DraggableEvent>
  );
}

function spanCategoryTone(category: PlannerEvent["category"]) {
  switch (category) {
    case "Exams":
      return "border-violet-300 bg-violet-200/75 text-violet-900";
    case "Group Events":
      return "border-emerald-300 bg-emerald-200/75 text-emerald-900";
    case "Private Events":
      return "border-amber-300 bg-amber-200/80 text-amber-900";
    case "Inbox":
      return "border-slate-300 bg-slate-200 text-slate-700";
    default:
      return "border-slate-300 bg-slate-200 text-slate-700";
  }
}
