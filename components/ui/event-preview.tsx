"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { getCalendarTheme } from "@/features/planner/lib/category-config";
import { getWeekTheme } from "@/features/weekly-schedule/lib/week-category-config";
import {
  plannerWeekEventCategories,
  type PlannerWeekEventCategory,
} from "@/features/weekly-schedule/lib/week-types";

/**
 * Adapter shape used by the preview UI.
 *
 * Acts as a unified view model so a single preview component can render
 * both date-based calendar events and time-based weekly routines. Fields
 * for the alternate domain are optional and only populated when relevant.
 */
export type PreviewEventShape = {
  title: string;
  category: string;
  participants: string[];
  description?: string;
  // week event fields
  day?: string;
  startTime?: string;
  endTime?: string;
  // calendar event fields
  startDate?: string | null;
  endDate?: string | null;
};

// Helper to convert "YYYY-MM-DD" to "DD.MM.YYYY"
function formatDisplayDate(dateStr?: string | null) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
  }
  return dateStr; // Fallback if it's already formatted or a weird string
}

/**
 * Determine if a category is a weekly event category
 */
function isWeekEventCategory(
  category: string,
): category is PlannerWeekEventCategory {
  return plannerWeekEventCategories.includes(
    category as PlannerWeekEventCategory,
  );
}

/**
 * Get the badge style for any category (calendar or weekly)
 */
function categoryBadgeStyle(category: string): string {
  if (isWeekEventCategory(category)) {
    return getWeekTheme(category).card;
  }
  return getCalendarTheme(category).badge;
}

/**
 * Get the description field style for any category (calendar or weekly)
 */
function getDescriptionFieldStyle(category: string): string {
  if (isWeekEventCategory(category)) {
    return getWeekTheme(category).card;
  }
  return getCalendarTheme(category).section;
}

/**
 * Get the description label heading color for any category
 */
function getDescriptionLabelColor(category: string): string {
  if (isWeekEventCategory(category)) {
    return getWeekTheme(category).heading;
  }
  return getCalendarTheme(category).heading;
}

/**
 * Read-only preview modal for an event.
 *
 * Displays a stylized, non-editable summary card for an event. Use this
 * when the user needs a quick inspection of event details before opening
 * the full edit form. The component accepts the unified `PreviewEventShape`
 * and adapts rendering based on which domain-specific fields are present.
 */
export function EventPreviewModal({
  heading,
  event,
  onEdit,
  onDelete,
  onClose,
}: {
  heading: string;
  event: PreviewEventShape;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const displayDay = formatDisplayDate(event.day) || event.day || "";

  useEffect(() => {
    function handleEscape(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const hasTime = event.startTime !== undefined || event.endTime !== undefined;
  const dateLine = hasTime
    ? `${displayDay},  ${event.startTime} - ${event.endTime}`
    : event.startDate
      ? `${formatDisplayDate(event.startDate)}${event.endDate && event.endDate !== event.startDate ? ` - ${formatDisplayDate(event.endDate)}` : ""}`
      : "Date TBD";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${heading}: ${event.title}`}
    >
      <div
        className="w-full max-w-md rounded-xl border border-sam-border bg-sam-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Title and Top Right Actions */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sam-text-3">
            {heading}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDeleting(true)}
              className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-md border border-sam-border text-sam-text-2 transition-colors hover:bg-sam-surface-2 hover:text-sam-text-1 dark:hover:bg-sam-surface-2"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-md border border-sam-border text-sam-text-2 transition-colors hover:bg-sam-surface-2 hover:text-sam-text-1 dark:hover:bg-sam-surface-2"
              aria-label="Edit"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-md border border-sam-border text-sam-text-2 transition-colors hover:bg-sam-surface-2 hover:text-sam-text-1 dark:hover:bg-sam-surface-2"
              aria-label="Close"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div
          className={`rounded-xl border p-4 ${categoryBadgeStyle(
            event.category,
          )}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold leading-none">
                {event.title}
              </h3>
              <p className="mt-2 text-sm font-medium opacity-80">{dateLine}</p>
            </div>

            <span className="shrink-0 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-900 shadow-sm">
              {event.category}
            </span>
          </div>

          <div className="mt-4 text-[13px] font-medium opacity-90">
            {event.participants.join(" · ") || "No participants"}
          </div>

          {event.description ? (
            <div
              className={`mt-4 rounded-lg border p-3 opacity-90 ${getDescriptionFieldStyle(event.category)}`}
            >
              <p
                className={`text-[10px] font-bold uppercase tracking-[0.18em] ${getDescriptionLabelColor(event.category)}`}
              >
                Description
              </p>
              <p className="mt-2 whitespace-pre-wrap leading-6 text-sm font-medium">
                {event.description}
              </p>
            </div>
          ) : null}
        </div>

        {isDeleting ? (
          <div className="mt-4 space-y-2 rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-900/60 dark:bg-red-950/40">
            <p className="text-xs font-medium text-red-800 text-center dark:text-red-200">
              Remove this event from your planner?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                className="flex-1 rounded-md border border-sam-border bg-sam-surface px-2 py-1.5 text-xs text-sam-text-2 hover:bg-sam-surface-3 dark:hover:bg-slate-600"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="flex-1 rounded-md bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Yes, remove
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
