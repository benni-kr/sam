"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { EventBadge } from "@/features/planner/components/event-badge";
import { EventPreviewModal } from "@/components/ui/event-preview";
import { PlannerEventForm } from "@/features/planner/components/event-form";
import { useFriendsState } from "@/features/friends/state/friends-state";
import { usePlannerState } from "@/features/planner/state/planner-state";
import {
  type PlannerEvent,
  type PlannerEventCategory,
} from "@/features/planner/lib/planner";
import { getCalendarTheme } from "@/features/planner/lib/category-config";

type DraggableEventProps = {
  event: PlannerEvent;
  compact?: boolean;
  children?: React.ReactNode;
};

/**
 * External store subscriptions for touch device detection.
 *
 * Why: We use `useSyncExternalStore` to subscribe to browser media queries
 * without causing hydration mismatches or lint warnings, ensuring the UI knows
 * whether it is on a touch device before the first render completes.
 */
const touchDeviceStore = {
  subscribe(callback: () => void) {
    const mql = window.matchMedia("(pointer:coarse)");
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  },
  getSnapshot() {
    return window.matchMedia("(pointer:coarse)").matches;
  },
  getServerSnapshot() {
    return false; // Default to false for SSR and hydration
  },
};

/**
 * Universal interaction wrapper for events.
 *
 * This component orchestrates drag-and-drop state, touch-safety, and the
 * transition between preview/edit modals for event interactions.
 * The `compact` prop switches the visual presentation between the pill style
 * used in the Inbox/List and the badge style used in the Calendar.
 */
export function DraggableEvent({
  event,
  compact = false,
  children,
}: DraggableEventProps) {
  const theme = getCalendarTheme(event.category);
  const { updateEvent, deleteEvent } = usePlannerState();
  const { friends } = useFriendsState();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  /**
   * FIX: Replaces useEffect/useState for touch detection with useSyncExternalStore.
   * This satisfies the lint rule by subscribing to the browser API as an external system.
   */
  const isTouchDevice = useSyncExternalStore(
    touchDeviceStore.subscribe,
    touchDeviceStore.getSnapshot,
    touchDeviceStore.getServerSnapshot,
  );

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `event:${event.id}`,
      data: {
        eventId: event.id,
      },
      // Dragging is disabled on touch devices to prevent the "stuck scroll"
      // bug, where a user tries to scroll the page but accidentally picks up
      // an event instead.
      disabled: isTouchDevice,
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
          className={`${isTouchDevice ? "touch-auto" : "touch-none"} cursor-grab truncate rounded-lg border px-2 py-1 text-[11px] leading-4 active:cursor-grabbing ${theme.badge} ${isDragging ? "opacity-40" : "opacity-100"}`}
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
        className={`${isTouchDevice ? "touch-auto" : "touch-none"} cursor-grab active:cursor-grabbing ${
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

  if (!isEditing) {
    return (
      <EventPreviewModal
        heading="Event details"
        event={{
          title: event.title,
          category: event.category,
          participants: event.participants,
          startDate: event.startDate,
          endDate: event.endDate,
        }}
        onEdit={() => setIsEditing(true)}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit event: ${event.title}`}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
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
      </div>
    </div>
  );
}
