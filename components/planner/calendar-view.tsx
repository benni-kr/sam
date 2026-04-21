"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useState } from "react";

import { EventBadge } from "@/components/planner/event-badge";
import { DraggableEvent } from "@/components/planner/draggable-event";
import { MonthCard } from "@/components/planner/month-card";
import { usePlannerState } from "@/components/planner/planner-state";
import type { PlannerEvent } from "@/lib/planner";

export function CalendarView() {
  const {
    activeSemester,
    events,
    inboxEvents,
    months,
    moveEventToDate,
    moveEventToInbox,
  } = usePlannerState();
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const activeEvent: PlannerEvent | null = activeEventId
    ? (events.find((event) => event.id === activeEventId) ?? null)
    : null;

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);

    if (!activeId.startsWith("event:")) {
      setActiveEventId(null);
      return;
    }

    setActiveEventId(activeId.replace("event:", ""));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveEventId(null);

    const overId = event.over?.id;

    if (!overId) {
      return;
    }

    const activeId = String(event.active.id);

    if (!activeId.startsWith("event:")) {
      return;
    }

    const eventId = activeId.replace("event:", "");
    const targetId = String(overId);

    if (targetId === "inbox") {
      moveEventToInbox(eventId);
      return;
    }

    if (targetId.startsWith("date:")) {
      moveEventToDate(eventId, targetId.replace("date:", ""));
    }
  }

  function handleDragCancel() {
    setActiveEventId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <section className="flex min-h-0 flex-1 flex-col gap-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Calendar View
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Six-month grid for {activeSemester.label}
              </h2>
            </div>
            <div className="hidden text-sm text-slate-500 md:block">
              Drag events between inbox and calendar cells.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {months.map((month) => (
              <MonthCard
                key={`${month.year}-${month.monthIndex}`}
                month={month}
              />
            ))}
          </div>
        </div>

        <InboxDropZone events={inboxEvents} />
      </section>

      <DragOverlay>
        {activeEvent ? (
          <div className="w-full max-w-md rotate-1 shadow-2xl">
            <EventBadge event={activeEvent} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function InboxDropZone({
  events,
}: {
  events: ReturnType<typeof usePlannerState>["inboxEvents"];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "inbox",
    data: {
      targetType: "inbox",
    },
  });

  return (
    <section
      ref={setNodeRef}
      className={`rounded-[2rem] border border-dashed p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] sm:p-5 ${
        isOver
          ? "border-slate-900 bg-slate-100/90"
          : "border-slate-300 bg-[#faf7f0]/90"
      }`}
    >
      <div className="mb-4 flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Inbox
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Unscheduled events waiting for a date
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          Drop here to unschedule an event.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {events.map((event) => (
          <DraggableEvent key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
