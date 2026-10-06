"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@dnd-kit/core";

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
  const { friendNames } = useFriendsState();
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

  const { attributes, listeners, setNodeRef, isDragging } =
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
          {...listeners}
          {...attributes}
          onClick={openPreview}
          className={`${isTouchDevice ? "touch-auto" : "touch-none"} inline-flex max-w-full cursor-grab items-center rounded-lg border px-2 py-0.5 text-[11px] font-medium leading-4 shadow-xs transition-transform active:cursor-grabbing hover:brightness-95 dark:hover:brightness-110 ${theme.badge} ${isDragging ? "opacity-40" : "opacity-100"}`}
        >
          <span className="truncate">{event.title}</span>
        </div>

        {canUsePortal && isPreviewOpen
          ? createPortal(
              <EventDetailsModal
                event={event}
                availableParticipants={friendNames}
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
              availableParticipants={friendNames}
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

export function EventDetailsModal({
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
      description?: string;
      category: PlannerEventCategory;
      startDate: string | null;
      endDate: string | null;
      startTime?: string | null;
      endTime?: string | null;
      participants: string[];
    },
  ) => void;
  onDelete: (eventId: string) => void;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [category, setCategory] = useState<PlannerEventCategory>(
    event.category,
  );
  const [startDate, setStartDate] = useState(event.startDate ?? "");
  const [endDate, setEndDate] = useState(event.endDate ?? "");
  const [startTime, setStartTime] = useState(event.startTime ?? "");
  const [endTime, setEndTime] = useState(event.endTime ?? "");
  const [participants, setParticipants] = useState(event.participants);

  function handleSubmit(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();

    onSave(event.id, {
      title,
      description,
      category,
      startDate: startDate || null,
      endDate: endDate || null,
      startTime: startTime || null,
      endTime: endTime || null,
      participants,
    });

    setIsEditing(false);
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
          id: event.id,
          title: event.title,
          description: event.description,
          category: event.category,
          participants: event.participants,
          startDate: event.startDate,
          endDate: event.endDate,
          startTime: event.startTime,
          endTime: event.endTime,
        }}
        onEdit={() => setIsEditing(true)}
        onDelete={handleDeleteConfirm}
        onClose={onClose}
      />
    );
  }

  return (
    <PlannerEventForm
      heading="Edit event"
      submitLabel="Save changes"
      title={title}
      description={description}
      category={category}
      startDate={startDate}
      endDate={endDate}
      startTime={startTime}
      endTime={endTime}
      participants={participants}
      availableParticipants={availableParticipants}
      onTitleChange={setTitle}
      onDescriptionChange={setDescription}
      onCategoryChange={setCategory}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onStartTimeChange={setStartTime}
      onEndTimeChange={setEndTime}
      onParticipantsChange={setParticipants}
      onSubmit={handleSubmit}
      onCancel={() => setIsEditing(false)}
    />
  );
}
