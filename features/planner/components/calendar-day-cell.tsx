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
          ? "border-sam-solid bg-sam-surface-3 dark:bg-sam-surface-3"
          : // Weekend columns use a slightly darker tone.
            isWeekend
            ? "border-sam-border bg-sam-surface-2/90 hover:bg-sam-surface-3 dark:bg-slate-800/60 dark:hover:bg-slate-800"
            : "border-sam-border bg-sam-surface hover:bg-sam-surface-2 dark:hover:bg-slate-800"
      }`}
    >
      <div className="text-[11px] font-medium text-sam-text-3">{day}</div>

      <button
        type="button"
        onClick={() => openCreateEvent(dateKey)}
        aria-label={`Create event on ${dateKey}`}
        className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md border border-sam-border bg-sam-surface text-sam-text-3 opacity-0 shadow-sm transition-all hover:border-sam-border-2 hover:bg-sam-surface-2 hover:text-sam-text-2 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-sam-surface-2 dark:hover:border-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
