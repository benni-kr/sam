"use client";

import { useDroppable } from "@dnd-kit/core";

type CalendarDayCellProps = {
  day: number;
  dateKey: string;
  isWeekend?: boolean;
};

export function CalendarDayCell({
  day,
  dateKey,
  isWeekend = false,
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
      className={`group relative h-full min-h-28 border-b border-r px-2 py-2 transition-colors last:border-r-0 ${
        isOver
          ? "border-slate-900 bg-slate-100"
          : isWeekend
            ? "border-slate-200 bg-slate-50/90 hover:bg-slate-100"
            : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="text-[11px] font-medium text-slate-500">{day}</div>
    </div>
  );
}
