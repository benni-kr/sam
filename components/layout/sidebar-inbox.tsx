"use client";

import { useDroppable } from "@dnd-kit/core";

import { DraggableEvent } from "@/features/planner/components/draggable-event";
import { usePlannerState } from "@/features/planner/state/planner-state";
import { useFilterState } from "@/features/planner/state/filter-state";

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
  const { applyFilters } = useFilterState();
  const visibleInboxEvents = applyFilters(inboxEvents);
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
          ? "border-sam-solid bg-sam-surface-3 dark:bg-sam-surface-3"
          : "border-sam-border-2 bg-sam-surface/90"
      }`}
    >
      <div className="mb-3 border-b border-sam-border pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sam-text-3">
          Inbox
        </p>
      </div>

      <div className="space-y-2 overflow-hidden">
        {visibleInboxEvents.map((event) => (
          <DraggableEvent key={event.id} event={event} compact />
        ))}
      </div>
    </section>
  );
}
