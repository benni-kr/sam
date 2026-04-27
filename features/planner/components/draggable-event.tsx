"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { EventBadge } from "@/features/planner/components/event-badge";
import { PlannerEventForm } from "@/features/planner/components/event-form";
import { usePlannerState } from "@/features/planner/state/planner-state";
import {
  type PlannerEvent,
  type PlannerEventCategory,
} from "@/features/planner/lib/planner";

type DraggableEventProps = {
  event: PlannerEvent;
  compact?: boolean;
  children?: React.ReactNode;
};

function compactTone(category: PlannerEventCategory) {
  switch (category) {
    case "Exam":
      return "border-violet-200 bg-violet-50 text-violet-900";
    case "Group Event":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "Private Event":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "Other":
      return "border-sky-200 bg-sky-50 text-sky-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

/**
 * Shared drag wrapper for calendar and inbox event presentations.
 */
export function DraggableEvent({
  event,
  compact = false,
  children,
}: DraggableEventProps) {
  const { updateEvent, deleteEvent, friends } = usePlannerState();
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

  const style = compact
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

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
          className={`touch-none cursor-grab truncate rounded-lg border px-2 py-1 text-[11px] leading-4 active:cursor-grabbing ${compactTone(
            event.category,
          )} ${isDragging ? "opacity-40" : "opacity-100"}`}
        >
          {event.title}
        </div>

        {canUsePortal && isPreviewOpen
          ? createPortal(
              <EventDetailsModal
                event={event}
                availableParticipants={friends}
                onSave={updateEvent}
                onDelete={deleteEvent}
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
          isDragging ? "opacity-0" : "opacity-100"
        }`}
      >
        {children ?? <EventBadge event={event} />}
      </div>

      {canUsePortal && isPreviewOpen
        ? createPortal(
            <EventDetailsModal
              event={event}
              availableParticipants={friends}
              onSave={updateEvent}
              onDelete={deleteEvent}
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
  availableParticipants,
  onSave,
  onDelete,
  onClose,
}: {
  event: PlannerEvent;
  availableParticipants: string[];
  onSave: (
    eventId: string,
    input: {
      title: string;
      category: PlannerEventCategory;
      startDate: string | null;
      endDate: string | null;
      participants: string[];
    },
  ) => void;
  onDelete: (eventId: string) => void;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [category, setCategory] = useState<PlannerEventCategory>(
    event.category,
  );
  const [startDate, setStartDate] = useState(event.startDate ?? "");
  const [endDate, setEndDate] = useState(event.endDate ?? "");
  const [participants, setParticipants] = useState(event.participants);

  function handleSubmit(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();

    onSave(event.id, {
      title,
      category,
      startDate: startDate || null,
      endDate: endDate || null,
      participants,
    });

    onClose();
  }

  function handleDeleteConfirm() {
    onDelete(event.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Event details: ${event.title}`}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {isEditing ? (
          <PlannerEventForm
            heading="Edit event"
            submitLabel="Save changes"
            title={title}
            category={category}
            startDate={startDate}
            endDate={endDate}
            participants={participants}
            availableParticipants={availableParticipants}
            onTitleChange={setTitle}
            onCategoryChange={setCategory}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onParticipantsChange={setParticipants}
            onSubmit={handleSubmit}
            onCancel={() => setIsEditing(false)}
            deleteAction={{
              label: "Delete event",
              prompt: "Are you sure you want to delete this event?",
              confirmLabel: "Yes, delete",
              onDelete: handleDeleteConfirm,
            }}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Event details
              </p>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
                aria-label="Edit event"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Edit
              </button>
            </div>

            <EventBadge event={event} />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
