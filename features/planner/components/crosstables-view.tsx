"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Check, Maximize2, Minimize2 } from "lucide-react";

import { EventPreviewModal } from "@/components/ui/event-preview";
import { PlannerEventForm } from "@/features/planner/components/event-form";
import { useFriendsState } from "@/features/friends/state/friends-state";
import { usePlannerState } from "@/features/planner/state/planner-state";
import { useFilterState } from "@/features/planner/state/filter-state";
import {
  plannerEventCategories,
  type PlannerEvent,
  type PlannerEventCategory,
} from "@/features/planner/lib/planner";
import { getCalendarTheme } from "@/features/planner/lib/category-config";

const categoryLabelsPlural: Record<PlannerEventCategory, string> = {
  Exam: "Exams",
  "Semi Exam": "Semi Exams",
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
  const { applyFilters, hiddenCategories } = useFilterState();
  const { friendNames } = useFriendsState();
  const hideFinished = searchParams.get("hideFinished") !== "0";
  const hideUndated = searchParams.get("hideUndated") === "1";
  const hideInactiveParticipants = searchParams.get("hideInactive") === "1";
  const todayDateKey = getTodayDateKey();
  const [previewEventId, setPreviewEventId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [pinnedParticipantNames, setPinnedParticipantNames] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const crosstableEvents = useMemo(
    // Deduplicate here to avoid rendering bugs if an event briefly appears in
    // both the "Chronological" and "Inbox" arrays during a state transition.
    () =>
      applyFilters(
        dedupeEventsById([
          ...events.filter((event) => Boolean(event.startDate)),
          ...inboxEvents,
        ]),
      ),
    [events, inboxEvents, applyFilters],
  );

  const filteredCrosstableEvents = useMemo(
    () =>
      crosstableEvents.filter((event) => {
        if (!event.startDate) return !hideUndated;
        if (!hideFinished) return true;
        const endDate = event.endDate ?? event.startDate;
        return endDate >= todayDateKey;
      }),
    [crosstableEvents, hideUndated, hideFinished, todayDateKey],
  );

  const previewEvent = useMemo(
    () => crosstableEvents.find((event) => event.id === previewEventId) ?? null,
    [crosstableEvents, previewEventId],
  );

  const editingEvent = useMemo(
    () => crosstableEvents.find((event) => event.id === editingEventId) ?? null,
    [crosstableEvents, editingEventId],
  );

  useEffect(() => {
    if (!previewEvent && !editingEvent && !isFullscreen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (previewEvent || editingEvent) {
          setPreviewEventId(null);
          setEditingEventId(null);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [previewEvent, editingEvent, isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isFullscreen]);

  const eventsByCategory = plannerEventCategories.reduce(
    (acc, category) => {
      acc[category] = sortCategoryEvents(
        filteredCrosstableEvents.filter((event) => event.category === category),
      );
      return acc;
    },
    {} as Record<PlannerEventCategory, PlannerEvent[]>,
  );

  const visibleCategories = plannerEventCategories.filter(
    (category) =>
      !hiddenCategories.has(category) &&
      (eventsByCategory[category]?.length ?? 0) > 0,
  );

  const handleToggleParticipant = (eventId: string, participantName: string) => {
    setPinnedParticipantNames((prev) =>
      prev.includes(participantName) ? prev : [...prev, participantName],
    );
    toggleParticipant(eventId, participantName);
  };

  const allParticipantNames = useMemo(() => {
    const names = new Set(
      hideInactiveParticipants ? pinnedParticipantNames : friendNames,
    );
    for (const event of filteredCrosstableEvents) {
      for (const p of event.participants ?? []) {
        names.add(p);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [hideInactiveParticipants, pinnedParticipantNames, friendNames, filteredCrosstableEvents]);

  const isFitMode = isFullscreen;

  /**
   * Density logic calibrated for laptop screens and accessible mobile touch targets.
   */
  const count = allParticipantNames.length;
  let colWidthClass = "w-14 min-w-14";
  let cellPaddingClass = "px-1.5";
  let checkContainerClass = "h-8 w-8";
  let checkIconSize = 20;
  let labelSize = "text-[12px]";
  if (count > 7) {
    colWidthClass = "w-11 min-w-11";
    cellPaddingClass = "px-1";
    checkContainerClass = "h-7.5 w-7.5";
    checkIconSize = 17;
    labelSize = "text-[11px]";
  }
  if (count > 14) {
    colWidthClass = "w-9 min-w-9";
    cellPaddingClass = "px-0.5";
    checkContainerClass = "h-7 w-7";
    checkIconSize = 16;
    labelSize = "text-[10px]";
  }
  if (count > 20) {
    colWidthClass = "w-8 min-w-8";
    cellPaddingClass = "px-0";
    checkContainerClass = "h-6 w-6";
    checkIconSize = 14;
    labelSize = "text-[9.5px]";
  }
  if (isFitMode) {
    colWidthClass = "w-auto min-w-0";
    cellPaddingClass = "px-0";
    checkContainerClass = count > 20 ? "h-2 w-2 sm:h-2.5 sm:w-2.5" : "h-2.5 w-2.5 sm:h-3 sm:w-3";
    checkIconSize = count > 20 ? 6 : 7;
    labelSize = count > 20 ? "text-[7px]" : "text-[7.5px] sm:text-[8.5px]";
  }

  return (
    <section
      className={
        isFullscreen
          ? "fixed inset-0 z-45 flex flex-col bg-page text-sam-text-1 p-2 sm:p-4"
          : "flex flex-col h-[calc(100dvh+1rem)] sm:h-[calc(100dvh+2rem)] lg:h-full flex-1 min-h-[640px] sm:min-h-[680px] lg:min-h-0 w-full max-w-full min-w-0"
      }
    >
      {visibleCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-sam-border bg-slate-50/70 px-6 py-14 text-center dark:bg-slate-800/50">
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-sam-border bg-sam-surface shadow-sm dark:bg-sam-surface-2">
            <CalendarDays
              className="h-7 w-7 text-sam-text-4"
              aria-hidden="true"
            />
          </div>
          <h3 className="text-lg font-semibold text-sam-text-1">
            No events found
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-sam-text-3">
            Add a new event from the sidebar, or adjust your filters to see more
            events.
          </p>
        </div>
      ) : (
        <div
          className={`flex flex-col flex-1 min-h-0 h-full w-full min-w-0 max-w-full overflow-hidden ${
            isFullscreen
              ? "rounded-2xl sm:rounded-[2rem] shadow-2xl"
              : "rounded-[2rem] shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_80px_rgba(15,23,42,0.06)]"
          } border border-sam-border bg-sam-surface/95 backdrop-blur`}
        >
          {/* Fullscreen Top Toolbar */}
          {isFullscreen && (
            <div className="flex-none flex items-center justify-between px-3 sm:px-4 py-2 border-b border-sam-border bg-sam-surface-2/80 dark:bg-slate-900/80 backdrop-blur">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-sam-text-1 truncate">
                  Full Matrix Overview
                </span>
                <span className="rounded-full border border-sam-border bg-sam-surface px-2 py-0.5 text-[10px] font-semibold text-sam-text-3 whitespace-nowrap">
                  {allParticipantNames.length}{" "}
                  {allParticipantNames.length === 1 ? "friend" : "friends"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sam-border bg-sam-solid px-2.5 py-1 text-xs font-semibold text-sam-solid-fg hover:opacity-90 transition-opacity active:scale-95 shadow-2xs"
                aria-label="Exit full screen"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                <span>Exit</span>
              </button>
            </div>
          )}

          {/* 2D Scroll Container */}
          <div
            className={`flex-1 min-h-0 h-full w-full min-w-0 max-w-full overflow-auto overscroll-contain scrollbar-slim ${
              isFitMode ? "overflow-x-hidden" : ""
            }`}
          >
            <table
              className={`${
                isFitMode ? "w-full" : "min-w-full"
              } table-fixed border-separate border-spacing-0 text-sm`}
            >
              <thead className="bg-sam-surface-2 dark:bg-slate-900">
                <tr>
                  {/* Sticky Top-Left Corner Cell: Fixed in BOTH axes */}
                  <th
                    className={`sticky top-0 left-0 z-40 ${
                      isFitMode
                        ? "w-[85px] min-w-[80px] max-w-[95px] sm:w-[140px] sm:min-w-[120px] sm:max-w-[160px] px-1.5 sm:px-2.5 py-1 pb-1.5"
                        : "w-[200px] min-w-[200px] sm:w-[240px] sm:min-w-[240px] px-3 sm:px-4 py-2 pb-2.5"
                    } border-b-2 border-r border-sam-border bg-sam-surface-2 dark:bg-slate-900 text-left align-bottom shadow-[3px_0_8px_-2px_rgba(0,0,0,0.08)] dark:shadow-[3px_0_8px_-2px_rgba(0,0,0,0.35)]`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`${
                          isFitMode ? "text-[10px] sm:text-xs" : "text-xs"
                        } font-bold uppercase tracking-[0.18em] text-sam-text-3`}
                      >
                        Event
                      </span>
                      {!isFullscreen && (
                        <button
                          type="button"
                          onClick={() => setIsFullscreen(true)}
                          className="inline-flex items-center gap-1 rounded-md border border-sam-border bg-sam-surface px-1.5 py-0.5 text-[10px] font-semibold text-sam-text-2 shadow-2xs hover:bg-sam-surface-2 hover:text-sam-text-1 transition-all active:scale-95"
                          title="Full screen overview (fit all participants)"
                          aria-label="Full screen overview"
                        >
                          <Maximize2 className="h-3 w-3" />
                          <span className="text-[10px]">Fit</span>
                        </button>
                      )}
                    </div>
                  </th>

                  {/* Sticky Top Participant Column Headers */}
                  {allParticipantNames.length === 0 ? (
                    <th className="sticky top-0 z-30 border-b-2 border-l border-sam-border bg-sam-surface-2 dark:bg-slate-900 px-4 py-3 text-center text-xs font-normal text-sam-text-4 italic">
                      No participants added
                    </th>
                  ) : (
                    allParticipantNames.map((participantName) => (
                      <th
                        key={participantName}
                        className={`${
                          isFitMode
                            ? "sticky top-0 z-30 border-b-2 border-l border-sam-border bg-sam-surface-2 dark:bg-slate-900 px-0 pt-1 pb-1 text-center align-bottom min-w-0"
                            : `${colWidthClass} sticky top-0 z-30 border-b-2 border-l border-sam-border bg-sam-surface-2 dark:bg-slate-900 ${cellPaddingClass} pt-2 pb-2 text-center align-bottom`
                        }`}
                      >
                        <div
                          className={`flex flex-col items-center justify-end ${
                            isFitMode ? "h-14 sm:h-18" : "h-20"
                          }`}
                        >
                          <span
                            className={`inline-block origin-center -rotate-180 whitespace-nowrap font-semibold tracking-tight text-sam-text-2 transition-colors hover:text-sam-text-1 [writing-mode:vertical-rl] ${
                              isFitMode
                                ? "text-[7.5px] sm:text-[9px] max-h-12 sm:max-h-16 truncate"
                                : labelSize
                            }`}
                            title={participantName}
                          >
                            {participantName}
                          </span>
                        </div>
                      </th>
                    ))
                  )}
                </tr>
              </thead>

              {/* Category Blocks */}
              {visibleCategories.map((category) => {
                const categoryEvents = eventsByCategory[category];
                const theme = getCalendarTheme(category);

                return (
                  <tbody key={category} className="group/category">
                    {/* Category Block Banner Row */}
                    <tr className="border-t-2 border-sam-border">
                      <th
                        colSpan={Math.max(2, 1 + allParticipantNames.length)}
                        className={`border-y border-sam-border ${
                          isFitMode
                            ? "px-1.5 sm:px-3 py-1"
                            : "px-3 sm:px-4 py-2"
                        } text-left shadow-2xs ${theme.section}`}
                      >
                        <div className="flex items-center justify-between w-full min-w-0">
                          <div
                            className={`sticky ${
                              isFitMode ? "left-1.5 sm:left-3" : "left-3 sm:left-4"
                            } z-20 inline-flex items-center gap-1 sm:gap-2`}
                          >
                            <span
                              className={`${
                                isFitMode
                                  ? "h-1.5 sm:h-2 w-1.5 sm:w-2"
                                  : "h-2 sm:h-2.5 w-2 sm:w-2.5"
                              } rounded-full ${theme.accent}`}
                            />
                            <span
                              className={`${
                                isFitMode
                                  ? "text-[10px] sm:text-xs tracking-wider"
                                  : "text-[11px] sm:text-xs tracking-[0.16em] sm:tracking-[0.2em]"
                              } font-bold uppercase ${theme.heading}`}
                            >
                              {categoryLabelsPlural[category]}
                            </span>
                          </div>

                          <div
                            className={`sticky ${
                              isFitMode
                                ? "right-1.5 sm:right-3"
                                : "right-3 sm:right-4"
                            } z-20 ml-auto inline-flex items-center pl-1.5 sm:pl-3`}
                          >
                            <span className="rounded-full border border-sam-border-2/70 bg-sam-surface/90 px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[10px] font-semibold uppercase tracking-wider text-sam-text-3 dark:bg-sam-surface-2/90 shadow-2xs whitespace-nowrap">
                              {categoryEvents.length}{" "}
                              {categoryEvents.length === 1 ? "event" : "events"}
                            </span>
                          </div>
                        </div>
                      </th>
                    </tr>

                    {/* Category Event Rows */}
                    {categoryEvents.map((event) => (
                      <tr
                        key={event.id}
                        className={`group/row transition-colors hover:bg-sam-surface-2/60 dark:hover:bg-slate-800/40 ${
                          isFitMode ? "h-6 sm:h-7" : ""
                        }`}
                      >
                        {/* Sticky Left Column: Event Title & Date */}
                        <td
                          className={`sticky left-0 z-10 ${
                            isFitMode
                              ? "w-[85px] min-w-[80px] max-w-[95px] sm:w-[140px] sm:min-w-[120px] sm:max-w-[160px] px-1.5 py-0.5 sm:py-1"
                              : "w-[200px] min-w-[200px] sm:w-[240px] sm:min-w-[240px] px-3 sm:px-4 py-2"
                          } border-b border-r border-sam-border bg-sam-surface dark:bg-sam-surface text-left shadow-[3px_0_8px_-2px_rgba(0,0,0,0.08)] dark:shadow-[3px_0_8px_-2px_rgba(0,0,0,0.35)] group-hover/row:bg-sam-surface-2 dark:group-hover/row:bg-slate-800 transition-colors`}
                        >
                          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                            <span
                              className={`${
                                isFitMode
                                  ? "h-1 w-1 sm:h-1.5 sm:w-1.5"
                                  : "h-2 w-2"
                              } rounded-full shrink-0 ${theme.accent}`}
                            />
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => setPreviewEventId(event.id)}
                                className={`block truncate text-left font-semibold text-sam-text-1 hover:underline underline-offset-2 leading-tight ${
                                  isFitMode
                                    ? "text-[10px] sm:text-[11px] max-w-[65px] sm:max-w-[115px]"
                                    : "text-sm max-w-[150px] sm:max-w-[190px]"
                                }`}
                                title={event.title}
                              >
                                {event.title}
                              </button>
                              <p
                                className={`font-medium tracking-tight text-sam-text-4 uppercase leading-none mt-0.5 truncate ${
                                  isFitMode ? "text-[8px] sm:text-[9px]" : "text-[11px]"
                                }`}
                              >
                                {event.startDate
                                  ? formatDisplayDate(event.startDate)
                                  : "Undated"}
                                {!isFitMode &&
                                event.endDate &&
                                event.endDate !== event.startDate
                                  ? ` – ${formatDisplayDate(event.endDate)}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Checkbox Cells */}
                        {allParticipantNames.length === 0 ? (
                          <td className="border-b border-l border-sam-border px-4 py-2 text-xs text-sam-text-4 italic text-center">
                            —
                          </td>
                        ) : (
                          allParticipantNames.map((participantName) => {
                            const isParticipating =
                              Array.isArray(event.participants) &&
                              event.participants.includes(participantName);

                            return (
                              <td
                                key={`${event.id}-${participantName}`}
                                className={`${
                                  isFitMode
                                    ? "border-b border-l border-sam-border p-0 text-center align-middle min-w-0 dark:border-slate-800/60"
                                    : `${colWidthClass} border-b border-l border-sam-border ${cellPaddingClass} py-2 text-center align-middle dark:border-slate-800/60`
                                }`}
                              >
                                <label
                                  className={`flex h-full w-full cursor-pointer items-center justify-center ${
                                    isFitMode ? "p-0" : "p-0.5"
                                  }`}
                                  title={`${participantName}: ${
                                    event.title
                                  } (${
                                    isParticipating
                                      ? "Participating"
                                      : "Not participating"
                                  })`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isParticipating}
                                    onChange={() =>
                                      handleToggleParticipant(
                                        event.id,
                                        participantName,
                                      )
                                    }
                                    className="sr-only"
                                  />
                                  <span
                                    className={`inline-flex items-center justify-center border border-transparent transition-all hover:bg-slate-200/50 dark:hover:bg-slate-700/50 active:scale-95 ${
                                      isFitMode
                                        ? count > 20
                                          ? "h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-[1.5px]"
                                          : "h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-[2px]"
                                        : `${checkContainerClass} rounded-lg`
                                    } ${
                                      isParticipating
                                        ? `${theme.checkbox} opacity-100 font-bold bg-sam-surface-2/80 dark:bg-slate-800/80 shadow-2xs`
                                        : "opacity-0"
                                    }`}
                                  >
                                    {isParticipating && (
                                      <Check
                                        size={
                                          isFitMode
                                            ? count > 20
                                              ? 6
                                              : 7
                                            : checkIconSize
                                        }
                                        strokeWidth={isFitMode ? 4 : 3}
                                      />
                                    )}
                                  </span>
                                  <span className="sr-only">
                                    Toggle {participantName} for {event.title}
                                  </span>
                                </label>
                              </td>
                            );
                          })
                        )}
                      </tr>
                    ))}
                  </tbody>
                );
              })}
            </table>
          </div>
        </div>
      )}

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
      startTime?: string | null;
      endTime?: string | null;
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

    onSaveComplete();
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
      onCancel={onClose}
    />
  );
}
