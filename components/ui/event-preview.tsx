"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarPlus,
  Check,
  Copy,
  Share2,
  Trash2,
} from "lucide-react";

import {
  buildGoogleCalendarUrl,
  buildICalendarEvent,
  downloadIcsFile,
} from "@/features/planner/lib/calendar-export";
import { getCalendarTheme } from "@/features/planner/lib/category-config";
import {
  defaultPlannerSemesterId,
  getSemesterIdForDate,
} from "@/features/planner/lib/planner";
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
  id?: string;
  title: string;
  category: string;
  participants: string[];
  description?: string;
  // week event fields
  day?: string;
  startTime?: string | null;
  endTime?: string | null;
  semesterId?: string | null;
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
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);
  const shareButtonRef = useRef<HTMLButtonElement | null>(null);
  const displayDay = formatDisplayDate(event.day) || event.day || "";

  useEffect(() => {
    function handleEscape(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape") {
        if (isShareMenuOpen) {
          setIsShareMenuOpen(false);
          return;
        }
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, isShareMenuOpen]);

  useEffect(() => {
    if (!isShareMenuOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(e.target as Node) &&
        !shareButtonRef.current?.contains(e.target as Node)
      ) {
        setIsShareMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isShareMenuOpen]);

  let dateLine = "Date TBD";
  if (event.day) {
    const timeStr = event.startTime
      ? event.endTime
        ? `; ${event.startTime} – ${event.endTime}`
        : `; ${event.startTime}`
      : "";
    dateLine = `${displayDay}${timeStr}`;
  } else if (event.startDate) {
    const dateRange = `${formatDisplayDate(event.startDate)}${
      event.endDate && event.endDate !== event.startDate
        ? ` – ${formatDisplayDate(event.endDate)}`
        : ""
    }`;
    const timeRange = event.startTime
      ? event.endTime
        ? `; ${event.startTime} – ${event.endTime}`
        : `; ${event.startTime}`
      : "";
    dateLine = `${dateRange}${timeRange}`;
  } else {
    dateLine = "Unscheduled";
  }

  function getShareUrl(): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    let shareUrl = origin;
    if (event.id) {
      if (event.startDate) {
        const semesterId = getSemesterIdForDate(event.startDate);
        shareUrl = `${origin}/?semester=${encodeURIComponent(semesterId)}&event=${encodeURIComponent(event.id)}`;
      } else if (event.day) {
        const currentUrlParams =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : null;
        const targetSemesterId =
          event.semesterId ||
          currentUrlParams?.get("semester") ||
          defaultPlannerSemesterId;
        shareUrl = `${origin}/week?semester=${encodeURIComponent(targetSemesterId)}&event=${encodeURIComponent(event.id)}`;
      } else {
        const currentUrlParams =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : null;
        const targetSemesterId =
          event.semesterId ||
          currentUrlParams?.get("semester") ||
          defaultPlannerSemesterId;
        shareUrl = `${origin}/?semester=${encodeURIComponent(targetSemesterId)}&event=${encodeURIComponent(event.id)}`;
      }
    }
    return shareUrl;
  }

  async function handleNativeShare() {
    const shareUrl = getShareUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `${event.title} (${dateLine})`,
          url: shareUrl,
        });
        setIsShareMenuOpen(false);
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          return;
        }
      }
    }
    await handleCopyLink();
  }

  async function handleCopyLink() {
    const shareUrl = getShareUrl();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          setIsShareMenuOpen(false);
        }, 1200);
      }
    } catch {
      // noop
    }
  }

  function handleGoogleCalendarExport() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = buildGoogleCalendarUrl(
      {
        id: event.id,
        title: event.title,
        category: event.category,
        description: event.description,
        startDate: event.startDate ?? null,
        endDate: event.endDate ?? null,
        startTime: event.startTime,
        endTime: event.endTime,
      },
      origin,
    );
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    setIsShareMenuOpen(false);
  }

  function handleAppleCalendarExport() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const ics = buildICalendarEvent(
      {
        id: event.id,
        title: event.title,
        category: event.category,
        description: event.description,
        startDate: event.startDate ?? null,
        endDate: event.endDate ?? null,
        startTime: event.startTime,
        endTime: event.endTime,
      },
      origin,
    );
    if (ics) {
      downloadIcsFile(`${event.title || "event"}.ics`, ics);
    }
    setIsShareMenuOpen(false);
  }

  const canExport = Boolean(event.startDate);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${heading}: ${event.title}`}
    >
      <div
        className="w-full max-w-md overflow-y-auto rounded-xl border border-sam-border bg-sam-surface p-5 shadow-2xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Title and Top Right Actions */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sam-text-3">
            {heading}
          </p>
          <div className="relative flex items-center gap-1.5 sm:gap-2">
            <button
              ref={shareButtonRef}
              type="button"
              onClick={() => setIsShareMenuOpen((open) => !open)}
              className={`inline-flex h-[34px] w-[34px] items-center justify-center rounded-md border border-sam-border transition-colors ${
                isShareMenuOpen || copied
                  ? "bg-sam-surface-2 text-sam-text-1 dark:bg-sam-surface-2"
                  : "text-sam-text-2 hover:bg-sam-surface-2 hover:text-sam-text-1 dark:hover:bg-sam-surface-2"
              }`}
              title="Share event"
              aria-label="Share event"
              aria-haspopup="menu"
              aria-expanded={isShareMenuOpen}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
              ) : (
                <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>

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

            {isShareMenuOpen ? (
              <div
                ref={shareMenuRef}
                role="menu"
                className="absolute right-0 top-full z-30 mt-1.5 w-56 sm:w-60 max-w-[calc(100vw-3rem)] overflow-hidden rounded-lg border border-sam-border bg-sam-surface p-1 shadow-xl"
              >
                {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleNativeShare}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-sam-text-2 transition-colors hover:bg-sam-surface-3 hover:text-sam-text-1 dark:hover:bg-sam-surface-2"
                  >
                    <Share2 className="h-3.5 w-3.5 text-sam-text-3" />
                    <span>Share via... (WhatsApp, etc.)</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleCopyLink}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-sam-text-2 transition-colors hover:bg-sam-surface-3 hover:text-sam-text-1 dark:hover:bg-sam-surface-2"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-sam-text-3" />
                  )}
                  <span>{copied ? "Link copied!" : "Copy link"}</span>
                </button>

                {canExport ? (
                  <>
                    <div className="my-1 border-t border-sam-border" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleGoogleCalendarExport}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-sam-text-2 transition-colors hover:bg-sam-surface-3 hover:text-sam-text-1 dark:hover:bg-sam-surface-2"
                    >
                      <CalendarPlus className="h-3.5 w-3.5 text-sam-text-3" />
                      <span>Add to Google Cal</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleAppleCalendarExport}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-sam-text-2 transition-colors hover:bg-sam-surface-3 hover:text-sam-text-1 dark:hover:bg-sam-surface-2"
                    >
                      <CalendarPlus className="h-3.5 w-3.5 text-sam-text-3" />
                      <span>Download .ics (Apple / Outlook)</span>
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Main Card */}
        <div
          className={`rounded-xl border p-4 ${categoryBadgeStyle(
            event.category,
          )}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="break-words text-lg font-semibold leading-none">
                {event.title}
              </h3>
              <p className="mt-2 text-sm font-medium opacity-80">{dateLine}</p>
            </div>

            <span className="shrink-0 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-900 shadow-sm">
              {event.category}
            </span>
          </div>

          <div className="mt-4 break-words text-[13px] font-medium opacity-90">
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
