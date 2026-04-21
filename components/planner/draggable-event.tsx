"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { EventBadge } from "@/components/planner/event-badge";
import type { PlannerEvent } from "@/lib/planner";

type DraggableEventProps = {
  event: PlannerEvent;
  compact?: boolean;
  children?: React.ReactNode;
};

/**
 * Shared drag wrapper for calendar and inbox event presentations.
 */
export function DraggableEvent({
  event,
  compact = false,
  children,
}: DraggableEventProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `event:${event.id}`,
      data: {
        eventId: event.id,
      },
    });

  const canUsePortal = typeof document !== "undefined";

  useEffect(() => {
    if (!isPreviewOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPreviewOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isPreviewOpen]);

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  function openPreview() {
    if (isDragging) {
      return;
    }

    setIsPreviewOpen(true);
  }

  if (compact) {
    return (
      <>
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          onClick={openPreview}
          className={`touch-none cursor-grab truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] leading-4 text-slate-700 active:cursor-grabbing ${
            isDragging ? "opacity-40" : "opacity-100"
          }`}
        >
          {event.title}
        </div>

        {canUsePortal && isPreviewOpen
          ? createPortal(
              <EventDetailsModal
                event={event}
                onClose={() => setIsPreviewOpen(false)}
              />,
              document.body,
            )
          : null}
      </>
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={openPreview}
        className={`touch-none cursor-grab active:cursor-grabbing ${
          isDragging ? "opacity-40" : "opacity-100"
        }`}
      >
        {children ?? <EventBadge event={event} />}
      </div>

      {canUsePortal && isPreviewOpen
        ? createPortal(
            <EventDetailsModal
              event={event}
              onClose={() => setIsPreviewOpen(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function EventDetailsModal({
  event,
  onClose,
}: {
  event: PlannerEvent;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Event details: ${event.title}`}
    >
      <div
        className="w-full max-w-md shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <EventBadge event={event} />
      </div>
    </div>
  );
}
