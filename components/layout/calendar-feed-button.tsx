"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { CalendarFeedModal } from "@/components/layout/calendar-feed-modal";

/**
 * Calendar feed subscription button.
 *
 * Placed in the sidebar header between NotificationToggle and ThemeToggle,
 * matching their circular icon-button appearance.
 */
export function CalendarFeedButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Subscribe to calendar feed"
        title="Subscribe to calendar feed"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-sam-border bg-sam-surface text-sam-text-3 transition-colors hover:bg-sam-surface-2 hover:text-sam-text-2 dark:bg-sam-surface-2 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      >
        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <CalendarFeedModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
