"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

import { EventPreviewModal } from "@/components/ui/event-preview";
import { PlannerEventForm } from "@/features/planner/components/event-form";
import { useFriendsState } from "@/features/friends/state/friends-state";
import { usePlannerState } from "@/features/planner/state/planner-state";
import {
  plannerEventCategories,
  type PlannerEvent,
  type PlannerEventCategory,
} from "@/features/planner/lib/planner";
import { getCalendarTheme } from "@/features/planner/lib/category-config";

const categoryLabelsPlural: Record<PlannerEventCategory, string> = {
  Exam: "Exams",
  "Language Exam": "Language Exams",
  "Group Event": "Group Events",
  "Private Event": "Private Events",
  Other: "Others",
};

/**
 * Cross-table view to manage participants per event by category.
 */
export function CrosstablesView() {
  const searchParams = useSearchParams();
  const { events, inboxEvents, toggleParticipant, updateEvent, deleteEvent } =
    usePlannerState();
  const { friendNames } = useFriendsState();
  const hideFinished = searchParams.get("hideFinished") === "1";
  const hideUndated = searchParams.get("hideUndated") === "1";
  const hideInactiveParticipants = searchParams.get("hideInactive") !== "0";
  const todayDateKey = getTodayDateKey();
  const [previewEventId, setPreviewEventId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const crosstableEvents = useMemo(
    // Deduplicate here to avoid rendering bugs if an event briefly appears in
    // both the "Chronological" and "Inbox" arrays during a state transition.
    () =>
      dedupeEventsById([
        ...events.filter((event) => Boolean(event.startDate)),
        ...inboxEvents,
      ]),
    [events, inboxEvents],
  );

  const filteredCrosstableEvents = crosstableEvents.filter((event) => {
    if (!event.startDate) return !hideUndated;
    if (!hideFinished) return true;
    const endDate = event.endDate ?? event.startDate;
    return endDate >= todayDateKey;
  });

  const previewEvent = useMemo(
    () => crosstableEvents.find((event) => event.id === previewEventId) ?? null,
    [crosstableEvents, previewEventId],
  );

  const editingEvent = useMemo(
    () => crosstableEvents.find((event) => event.id === editingEventId) ?? null,
    [crosstableEvents, editingEventId],
  );

  useEffect(() => {
    if (!previewEvent && !editingEvent) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewEventId(null);
        setEditingEventId(null);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [previewEvent, editingEvent]);

  const participantNames = useMemo(() => {
    return Array.from(
      new Set([
        ...(hideInactiveParticipants ? [] : friendNames),
        ...filteredCrosstableEvents.flatMap((event) => event.participants),
      ]),
    ).sort((a, b) => a.localeCompare(b));
  }, [friendNames, filteredCrosstableEvents, hideInactiveParticipants]);

  const eventsByCategory = plannerEventCategories.reduce(
    (acc, category) => {
      acc[category] = sortCategoryEvents(
        filteredCrosstableEvents.filter((event) => event.category === category),
      );
      return acc;
    },
    {} as Record<PlannerEventCategory, PlannerEvent[]>,
  );

  /**
   * Density logic calibrated for standard 1440px laptop screens.
   *
   * The 7- and 14-participant thresholds prevent horizontal layout breaks
   * while keeping the checkbox targets large enough for accessible touch and
   * pointer interaction.
   */
  // --- DENSITY LOGIC ---
  const count = participantNames.length;
  // Stage 1: Relaxed
  let colWidthClass = "w-16 min-w-16";
  let cellPaddingClass = "px-2";
  let checkContainerClass = "h-9 w-9";
  let checkIconSize = 22;
  let labelSize = "text-[12px]";

  if (count > 7) {
    // Stage 2: Standard
    colWidthClass = "w-12 min-w-12";
    cellPaddingClass = "px-1";
    checkContainerClass = "h-8 w-8";
    checkIconSize = 18;
    labelSize = "text-[11px]";
  }

  if (count > 14) {
    // Stage 3: Compact
    colWidthClass = "w-9 min-w-9";
    cellPaddingClass = "px-0.5";
    checkContainerClass = "h-7 w-7";
    checkIconSize = 16;
    labelSize = "text-[10px]";
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid gap-4">
        {plannerEventCategories.map((category) => {
          const categoryEvents = eventsByCategory[category];
          const theme = getCalendarTheme(category);

          return (
            <article
              key={category}
              className={`min-w-0 overflow-hidden rounded-[1.5rem] border p-4 shadow-sm ${theme.section}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${theme.accent}`} />
                <h3
                  className={`text-sm font-semibold uppercase tracking-[0.2em] ${theme.heading}`}
                >
                  {categoryLabelsPlural[category]}
                </h3>
                <span className="ml-auto rounded-full border border-sam-border-2 bg-sam-surface/80 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-sam-text-3 dark:bg-sam-surface-2/80">
                  {categoryEvents.length}{" "}
                  {categoryEvents.length === 1 ? "event" : "events"}
                </span>
              </div>

              <div className="max-w-full overflow-x-auto">
                <table className="min-w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-xl border border-sam-border bg-sam-surface/90 text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 min-w-[260px] border-b border-r border-sam-border bg-sam-surface-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-sam-text-3">
                        Event
                      </th>
                      {participantNames.map((participantName) => (
                        <th
                          key={`${category}-${participantName}-header`}
                          className={`${colWidthClass} border-b border-sam-border bg-sam-surface-2 ${cellPaddingClass} py-2 text-center align-bottom transition-all duration-200`}
                        >
                          <span
                            className={`inline-block origin-center -rotate-180 whitespace-nowrap font-medium tracking-[0.14em] text-sam-text-3 [writing-mode:vertical-rl] ${labelSize}`}
                            // `vertical-rl` writes text top-to-bottom; rotating
                            // it ensures names read naturally bottom-to-top,
                            // which is the standard for vertical table headers.
                          >
                            {participantName}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {categoryEvents.length === 0 ? (
                      <tr>
                        <td className="sticky left-0 z-20 border-r border-sam-border bg-sam-surface-2 px-3 py-4 text-left text-sm text-sam-text-3">
                          No events in this category yet.
                        </td>
                        {participantNames.map((n) => (
                          <td
                            key={n}
                            className={`${colWidthClass} border-l border-sam-border dark:border-slate-800`}
                          />
                        ))}
                      </tr>
                    ) : (
                      categoryEvents.map((event) => (
                        <tr
                          key={`${category}-${event.id}`}
                          className="odd:bg-sam-surface even:bg-sam-surface-2/50"
                        >
                          <td className="sticky left-0 z-20 border-r border-sam-border bg-sam-surface px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setPreviewEventId(event.id)}
                              className="font-medium text-sam-text-1 underline-offset-2 hover:underline"
                            >
                              {event.title}
                            </button>
                            <p className="text-[11px] uppercase tracking-[0.12em] text-sam-text-3">
                              {event.startDate
                                ? formatDisplayDate(event.startDate)
                                : "Undated"}
                              {event.endDate &&
                              event.endDate !== event.startDate
                                ? ` to ${formatDisplayDate(event.endDate)}`
                                : ""}
                            </p>
                          </td>

                          {participantNames.map((participantName) => (
                            <td
                              key={`${event.id}-${participantName}`}
                              className={`${colWidthClass} border-l border-sam-border ${cellPaddingClass} py-2 text-center transition-all duration-200 dark:border-slate-800`}
                            >
                              <label className="inline-flex cursor-pointer items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={event.participants.includes(
                                    participantName,
                                  )}
                                  onChange={() =>
                                    toggleParticipant(event.id, participantName)
                                  }
                                  className="peer sr-only"
                                />
                                <span
                                  className={`inline-flex ${checkContainerClass} items-center justify-center rounded-md border border-transparent opacity-0 transition-all hover:bg-slate-100 peer-checked:opacity-100 ${theme.checkbox}`}
                                >
                                  <Check size={checkIconSize} strokeWidth={3} />
                                </span>
                                <span className="sr-only">
                                  Toggle {participantName}
                                </span>
                              </label>
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}
      </div>

      {previewEvent ? (
        <EventPreviewModal
          heading="Event details"
          event={previewEvent}
          onEdit={() => {
            setEditingEventId(previewEvent.id);
            setPreviewEventId(null);
          }}
          onDelete={() => {
            deleteEvent(previewEvent.id);
            setPreviewEventId(null);
          }}
          onClose={() => setPreviewEventId(null)}
        />
      ) : null}

      {editingEvent && (
        <EventEditModal
          event={editingEvent}
          availableParticipants={friendNames}
          onSave={updateEvent}
          onClose={() => setEditingEventId(null)}
          onSaveComplete={() => {
            setPreviewEventId(editingEvent.id);
            setEditingEventId(null);
          }}
        />
      )}
    </section>
  );
}

function sortCategoryEvents(events: PlannerEvent[]) {
  return [...events].sort((left, right) => {
    if (!left.startDate && !right.startDate) {
      return left.title.localeCompare(right.title);
    }

    if (!left.startDate) {
      return 1;
    }

    if (!right.startDate) {
      return -1;
    }

    const startDateComparison = left.startDate.localeCompare(right.startDate);

    if (startDateComparison !== 0) {
      return startDateComparison;
    }

    return left.title.localeCompare(right.title);
  });
}

function formatDisplayDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-");

  if (!year || !month || !day) {
    return dateKey;
  }

  return `${day}.${month}.${year}`;
}

function dedupeEventsById(events: PlannerEvent[]) {
  const eventMap = new Map<string, PlannerEvent>();

  for (const event of events) {
    eventMap.set(event.id, event);
  }

  return Array.from(eventMap.values());
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function EventEditModal({
  event,
  availableParticipants,
  onSave,
  onClose,
  onSaveComplete,
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
      participants: string[];
    },
  ) => void;
  onClose: () => void;
  onSaveComplete: () => void;
}) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
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
      description,
      category,
      startDate: startDate || null,
      endDate: endDate || null,
      participants,
    });

    onSaveComplete();
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
        className="w-full max-w-md rounded-xl border border-sam-border bg-sam-surface p-4 shadow-2xl"
        onClick={(nextEvent) => nextEvent.stopPropagation()}
      >
        <PlannerEventForm
          heading="Edit event"
          submitLabel="Save changes"
          title={title}
          description={description}
          category={category}
          startDate={startDate}
          endDate={endDate}
          participants={participants}
          availableParticipants={availableParticipants}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onCategoryChange={setCategory}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onParticipantsChange={setParticipants}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </section>
    </div>
  );
}
