"use client";

import { CalendarDays } from "lucide-react";
import { useMemo, useState, useEffect, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { PlannerEventForm } from "@/features/planner/components/event-form";

import { useFriendsState } from "@/features/friends/state/friends-state";
import { usePlannerState } from "@/features/planner/state/planner-state";
import type {
  PlannerEvent,
  PlannerEventCategory,
} from "@/features/planner/lib/planner";

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const badgeDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function formatDate(dateKey: string) {
  return shortDateFormatter.format(new Date(`${dateKey}T12:00:00`));
}

function formatDateBadge(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  return {
    month: badgeDateFormatter.format(date).split(" ")[0] ?? "",
    day: String(date.getDate()).padStart(2, "0"),
  };
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getEventStatus(
  event: PlannerEvent,
  todayDateKey: string,
): "Active" | "Upcoming" | "Completed" {
  const endDate = event.endDate ?? event.startDate ?? todayDateKey;

  if (
    event.startDate &&
    event.startDate <= todayDateKey &&
    endDate >= todayDateKey
  ) {
    return "Active";
  }

  if (event.startDate && event.startDate > todayDateKey) {
    return "Upcoming";
  }

  return "Completed";
}

function categoryTone(category: string) {
  switch (category) {
    case "Exam":
      return "border-violet-200 bg-violet-50 text-violet-900";
    case "Language Exam":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "Group Event":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "Private Event":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "Other":
      return "border-sky-200 bg-sky-50 text-sky-900";
    default:
      return "border-stone-200 bg-stone-50 text-stone-700";
  }
}

// grouping helpers removed; feed is rendered as a single sorted list

/**
 * Compact schedule feed for quick scanning.
 */
export function ScheduleFeedView() {
  const { events, updateEvent, deleteEvent } = usePlannerState();
  const { friends } = useFriendsState();
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const editingEvent = useMemo(
    () => events.find((ev) => ev.id === editingEventId) ?? null,
    [events, editingEventId],
  );
  const todayDateKey = getTodayDateKey();
  const searchParams = useSearchParams();
  const hideFinished = searchParams.get("hideFinished") !== "0"; // default on

  const scheduledEvents = useMemo(
    () => events.filter((event) => Boolean(event.startDate)),
    [events],
  );

  const sortedEvents = useMemo(() => {
    const list = scheduledEvents.filter((event) => {
      if (!hideFinished) return true;

      const endDate = event.endDate ?? event.startDate ?? todayDateKey;
      return endDate >= todayDateKey;
    });

    return list.sort((left, right) => {
      if (left.startDate !== right.startDate) {
        return (left.startDate ?? "").localeCompare(right.startDate ?? "");
      }

      if (left.endDate !== right.endDate) {
        return (left.endDate ?? "").localeCompare(right.endDate ?? "");
      }

      return left.title.localeCompare(right.title);
    });
  }, [scheduledEvents, hideFinished, todayDateKey]);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-5">
        <div className="mt-4 space-y-4">
          {sortedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-14 text-center">
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-slate-200 bg-white shadow-sm">
                <CalendarDays
                  className="h-7 w-7 text-slate-400"
                  aria-hidden="true"
                />
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                No events match your current view
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Try showing completed events again, or add something new from
                the Calendar. Unscheduled ideas will still live in the Inbox.
              </p>
            </div>
          ) : (
            <section className="space-y-3 p-2 sm:p-3">
              {sortedEvents.map((event, idx) => {
                const scheduledLabel =
                  event.startDate &&
                  event.endDate &&
                  event.endDate !== event.startDate
                    ? `to ${formatDate(event.endDate)}`
                    : null;

                const badgeDate = event.startDate
                  ? formatDateBadge(event.startDate)
                  : null;

                const prev = sortedEvents[idx - 1];
                const prevMonth = prev?.startDate?.slice(0, 7) ?? null; // YYYY-MM
                const thisMonth = event.startDate?.slice(0, 7) ?? null;

                const isActive =
                  getEventStatus(event, todayDateKey) === "Active";

                return (
                  <div key={event.id}>
                    {thisMonth && thisMonth !== prevMonth ? (
                      <div className="mb-2 flex items-center gap-3 px-2">
                        <span className="text-lg font-semibold text-slate-800 sm:text-xl">
                          {new Date(
                            `${event.startDate}T12:00:00`,
                          ).toLocaleString(undefined, {
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    ) : null}

                    <article
                      className={`relative overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md ${
                        isActive ? "ring-2 ring-emerald-200" : ""
                      }`}
                    >
                      <div className="flex gap-3 p-3 sm:p-3.5">
                        <div
                          className={`relative flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl border ${categoryTone(
                            event.category,
                          )}`}
                        >
                          {badgeDate ? (
                            <>
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                                {badgeDate.month}
                              </span>
                              <span className="text-base font-semibold leading-none text-slate-900">
                                {badgeDate.day}
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                              Draft
                            </span>
                          )}

                          {/* Active indicator: keep ring on badge, remove dot */}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setEditingEventId(event.id)}
                                className="truncate text-sm font-semibold text-slate-950 text-left hover:underline"
                              >
                                {event.title}
                              </button>
                              {scheduledLabel ? (
                                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                  {scheduledLabel}
                                </p>
                              ) : null}
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${categoryTone(
                                event.category,
                              )}`}
                            >
                              {event.category}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {event.participants.map((participant) => (
                              <span
                                key={participant}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600"
                              >
                                {participant}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </div>

      {editingEvent ? (
        <EventEditModal
          event={editingEvent}
          availableParticipants={friends}
          onSave={updateEvent}
          onDelete={deleteEvent}
          onClose={() => setEditingEventId(null)}
        />
      ) : null}
    </section>
  );
}

function EventEditModal({
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
  const [title, setTitle] = useState(event.title);
  const [category, setCategory] = useState<PlannerEventCategory>(
    event.category,
  );
  const [startDate, setStartDate] = useState(event.startDate ?? "");
  const [endDate, setEndDate] = useState(event.endDate ?? "");
  const [participants, setParticipants] = useState(event.participants);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

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
      aria-label={`Edit event: ${event.title}`}
    >
      <section
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
        onClick={(nextEvent) => nextEvent.stopPropagation()}
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
          onCancel={onClose}
          deleteAction={{
            label: "Delete event",
            prompt: "Are you sure you want to delete this event?",
            confirmLabel: "Yes, delete",
            onDelete: handleDeleteConfirm,
          }}
        />
      </section>
    </div>
  );
}
