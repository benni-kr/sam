"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Check,
  Copy,
  X,
  Info,
  CalendarCheck,
} from "lucide-react";
import {
  plannerEventCategories,
  type PlannerEventCategory,
} from "@/features/planner/lib/planner";
import { getCalendarTheme } from "@/features/planner/lib/category-config";

type CalendarFeedModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type FeedTokenResponse = {
  token: string;
  scope: string;
  httpsUrl: string;
  webcalUrl: string;
};

export function CalendarFeedModal({ isOpen, onClose }: CalendarFeedModalProps) {
  const [feedData, setFeedData] = useState<FeedTokenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Category filter state: all categories selected by default
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    () => new Set(plannerEventCategories),
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const token = typeof window !== "undefined"
      ? window.localStorage.getItem("sam_auth_token")
      : null;

    fetch("/api/calendar/token", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to generate calendar feed token (${res.status})`);
        }
        return (await res.json()) as FeedTokenResponse;
      })
      .then((data) => {
        if (isMounted) {
          setFeedData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("[SAM Calendar Feed] Error fetching token:", err);
          setError(err instanceof Error ? err.message : "Failed to load calendar feed link.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  function toggleCategory(category: PlannerEventCategory) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        // Prevent deselecting all categories
        if (next.size > 1) {
          next.delete(category);
        }
      } else {
        next.add(category);
      }
      return next;
    });
  }

  // Build the URLs dynamically based on selected categories
  const { filteredHttpsUrl, filteredWebcalUrl } = useMemo(() => {
    if (!feedData) return { filteredHttpsUrl: "", filteredWebcalUrl: "" };

    const isAllSelected = selectedCategories.size === plannerEventCategories.length;
    if (isAllSelected) {
      return {
        filteredHttpsUrl: feedData.httpsUrl,
        filteredWebcalUrl: feedData.webcalUrl,
      };
    }

    const catParam = `&categories=${encodeURIComponent(Array.from(selectedCategories).join(","))}`;
    return {
      filteredHttpsUrl: `${feedData.httpsUrl}${catParam}`,
      filteredWebcalUrl: `${feedData.webcalUrl}${catParam}`,
    };
  }, [feedData, selectedCategories]);

  async function handleCopy() {
    if (!filteredHttpsUrl) return;

    try {
      await navigator.clipboard.writeText(filteredHttpsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
      const input = document.getElementById("calendar-feed-url-input") as HTMLInputElement | null;
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }
    }
  }

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-sam-border bg-sam-surface p-5 shadow-2xl transition-all dark:bg-sam-surface dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="calendar-feed-modal-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-sam-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sam-border bg-sam-surface-2 text-sam-solid-fg">
              <Calendar className="h-5 w-5 text-sam-text-1" />
            </div>
            <div>
              <h2
                id="calendar-feed-modal-title"
                className="text-base font-semibold text-sam-text-1"
              >
                Calendar Subscription
              </h2>
              <p className="text-xs text-sam-text-3">
                Live calendar feed for Apple Calendar, Google Calendar & Outlook
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sam-border bg-sam-surface text-sam-text-3 transition-colors hover:bg-sam-surface-2 hover:text-sam-text-1 dark:bg-sam-surface-2 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 text-xs text-sam-text-2">
          <p className="leading-relaxed">
            Subscribe once in your calendar app to automatically see your SAM events on all your devices.
            Any updates made in SAM will sync seamlessly in the background.
          </p>

          {/* Category Filter Selector */}
          <div className="rounded-xl border border-sam-border bg-sam-surface-2/60 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sam-text-3">
                Include Categories
              </span>
              <span className="text-[10px] text-sam-text-4">
                {selectedCategories.size} of {plannerEventCategories.length} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {plannerEventCategories.map((category) => {
                const isSelected = selectedCategories.has(category);
                const theme = getCalendarTheme(category);

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-sam-border-2 bg-sam-surface text-sam-text-1 shadow-2xs"
                        : "border-sam-border bg-sam-surface/40 text-sam-text-4 opacity-60 hover:opacity-90 hover:border-sam-border-2 hover:bg-sam-surface"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full transition-opacity ${theme.accent} ${
                        isSelected ? "opacity-100" : "opacity-40"
                      }`}
                    />
                    <span>{category}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feed URL Box & Primary Actions */}
          {loading ? (
            <div className="flex items-center justify-center py-6 text-sam-text-3">
              <span className="text-xs">Generating secure calendar link...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="calendar-feed-url-input"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-sam-text-3 mb-1.5"
                >
                  Subscription URL
                </label>
                <input
                  id="calendar-feed-url-input"
                  type="text"
                  readOnly
                  value={filteredHttpsUrl}
                  onClick={(e) => e.currentTarget.select()}
                  title="Click to select full URL"
                  className="w-full truncate rounded-lg border border-sam-border bg-sam-surface-2 px-3 py-2 text-xs font-mono text-sam-text-2 outline-none select-all dark:bg-slate-800/80 cursor-pointer"
                />
              </div>

              {/* Direct Quick Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <a
                  href={filteredWebcalUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-sam-solid bg-sam-solid px-3 py-2.5 text-xs font-semibold text-sam-solid-fg shadow-sm hover:opacity-90 transition-opacity text-center"
                >
                  <CalendarCheck className="h-4 w-4" />
                  <span>Subscribe in Apple Cal</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium shadow-2xs transition-all text-center ${
                    copied
                      ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:border-emerald-600/50 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold"
                      : "border-sam-border bg-sam-surface text-sam-text-1 hover:bg-sam-surface-2"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-sam-text-3" />
                      <span>Copy for Google / Outlook</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Platform Setup Guides */}
          <div className="rounded-xl border border-sam-border bg-sam-surface-2/40 p-3 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sam-text-3 block">
              How to add to your calendar:
            </span>
            <ul className="space-y-1.5 text-[11px] text-sam-text-3 list-disc pl-4">
              <li>
                <strong className="text-sam-text-2">Apple Calendar:</strong> Tap{" "}
                <em>Subscribe in Apple Cal</em> or open Calendar &rarr; File &rarr; New Calendar Subscription.
              </li>
              <li>
                <strong className="text-sam-text-2">Google Calendar:</strong> On the web, click{" "}
                <em>+</em> next to <em>Other calendars</em> &rarr; <em>From URL</em> and paste the link.
              </li>
              <li>
                <strong className="text-sam-text-2">Outlook:</strong> Go to Add calendar &rarr;{" "}
                <em>Subscribe from web</em> and paste the link.
              </li>
            </ul>

            <div className="flex items-start gap-1.5 pt-1 text-[11px] text-sam-text-4 border-t border-sam-border/60">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-sam-text-4" />
              <span>
                Apple Calendar refreshes hourly. Outlook updates every ~3–4 hours, and Google Calendar updates external feeds once every 8–24 hours.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
