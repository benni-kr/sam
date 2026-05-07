"use client";

/**
 * Atomic Interaction Unit of the calendar grid.
 *
 * This component handles both the manual creation of events via the shortcut
 * button and acts as a drop target for chronological rescheduling.
 */

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";

import { useCreateEvent } from "@/features/planner/components/create-event-context";

type CalendarDayCellProps = {
  day: number;
  dateKey: string;
  isWeekend?: boolean;
};

/**
 * Renders a droppable day cell in the month grid.
 *
 * The component uses a group-hover state to reveal the "Add Event" button,
 * keeping the calendar visually clean while still providing quick-action
 * shortcuts.
 */
export function CalendarDayCell({
  day,
  dateKey,
  isWeekend = false,
}: CalendarDayCellProps) {
  const { openCreateEvent } = useCreateEvent();
  const { isOver, setNodeRef } = useDroppable({
    // Domain Protocol: this ID format is used by the AppShell drag sensors to
    // distinguish date cells from other drop targets like the inbox.
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
          : // Weekend columns use a slightly darker tone.
            isWeekend
            ? "border-slate-200 bg-slate-50/90 hover:bg-slate-100"
            : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="text-[11px] font-medium text-slate-500">{day}</div>

      <button
        type="button"
        onClick={() => openCreateEvent(dateKey)}
        aria-label={`Create event on ${dateKey}`}
        className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 opacity-0 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
