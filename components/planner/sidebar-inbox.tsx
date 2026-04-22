"use client";

import { useDroppable } from "@dnd-kit/core";

import { DraggableEvent } from "@/components/planner/draggable-event";
import { usePlannerState } from "@/components/planner/planner-state";

/**
 * Sidebar drop zone for unscheduled events.
 */
export function SidebarInbox() {
  const { inboxEvents } = usePlannerState();
  const { setNodeRef, isOver } = useDroppable({
    id: "inbox",
    data: {
      targetType: "inbox",
    },
  });

  return (
    <section
      ref={setNodeRef}
      className={`rounded-[1.25rem] border border-dashed p-3 transition-colors ${
        isOver
          ? "border-slate-900 bg-slate-100"
          : "border-slate-300 bg-white/90"
      }`}
    >
      <div className="mb-3 border-b border-slate-200 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Inbox
        </p>
      </div>

      <div className="space-y-2">
        {inboxEvents.map((event) => (
          <DraggableEvent key={event.id} event={event} compact />
        ))}
      </div>
    </section>
  );
}
