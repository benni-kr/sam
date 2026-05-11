"use client";

import { useDroppable } from "@dnd-kit/core";

import { DraggableEvent } from "@/features/planner/components/draggable-event";
import { usePlannerState } from "@/features/planner/state/planner-state";

/**
 * Global inbox for unscheduled events.
 *
 * This component renders the repository of events that are not scheduled
 * on the calendar. Users can drag events off the calendar to "unschedule"
 * them — dropping onto this inbox stores them as unscheduled. The inbox
 * is intentionally global (outside specific semester/calendar views) so
 * that unscheduled events are discoverable and re-schedulable from a
 * single place in the UI.
 */
export function SidebarInbox() {
  const { inboxEvents } = usePlannerState();
  const { setNodeRef, isOver } = useDroppable({
    // NOTE: The exact string "inbox" is a DnD contract. app-shell.tsx's
    // `handleDragEnd` checks for this id to decide when to call
    // `moveEventToInbox`. Changing this string requires updating that
    // check in components/layout/app-shell.tsx accordingly.
    id: "inbox",
    data: {
      targetType: "inbox",
    },
  });

  return (
    <section
      ref={setNodeRef}
      className={`overflow-hidden rounded-[1.25rem] border border-dashed p-3 transition-colors ${
        isOver
          ? "border-slate-900 bg-slate-100 dark:border-white dark:bg-slate-700"
          : "border-slate-300 bg-white/90 dark:border-slate-600 dark:bg-slate-900/90"
      }`}
    >
      <div className="mb-3 border-b border-slate-200 pb-2 dark:border-slate-700">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Inbox
        </p>
      </div>

      <div className="space-y-2 overflow-hidden">
        {inboxEvents.map((event) => (
          <DraggableEvent key={event.id} event={event} compact />
        ))}
      </div>
    </section>
  );
}
