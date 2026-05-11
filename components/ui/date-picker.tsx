"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import { DayPicker } from "react-day-picker";

/**
 * Props for `DatePicker`.
 *
 * - `value`: a date string formatted as YYYY-MM-DD (ISO date). The component
 *   expects this exact format for parsing and will emit the same format when
 *   the user selects or clears a date.
 * - `onChange`: callback invoked with a string formatted as YYYY-MM-DD when
 *   the selection changes (or an empty string when cleared).
 * - `placeholder`: optional label shown when no date is selected.
 */
type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

/**
 * Lightweight date picker with a custom popover calendar.
 *
 * Provides a visually consistent popover across browsers and avoids the
 * styling and behavior inconsistencies of native `<input type="date">`
 * controls (different browsers render and localize that control unevenly).
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedDate = useMemo(() => {
    if (!value) {
      return undefined;
    }

    try {
      return parseISO(value);
    } catch {
      return undefined;
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="sam-date-picker relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="w-full rounded-lg border border-sam-border bg-sam-surface px-2 py-1.5 text-left text-xs text-sam-text-2 outline-none ring-slate-300 focus:ring dark:bg-sam-surface-2 dark:ring-slate-600"
      >
        {selectedDate ? format(selectedDate, "MMM d, yyyy") : placeholder}
      </button>

      {isOpen ? (
        <div className="absolute z-30 mt-1 rounded-xl border border-sam-border bg-sam-surface p-2 shadow-xl">
          <DayPicker
            mode="single"
            // We use the GB locale to ensure the calendar grid starts on
            // Monday (European/academic convention). Do not change without
            // verifying week-start expectations across the app.
            locale={enGB}
            selected={selectedDate}
            onDayClick={(_, __, event) => {
              event.preventDefault();
            }}
            onSelect={(date) => {
              onChange(date ? format(date, "yyyy-MM-dd") : "");
              setIsOpen(false);
            }}
            modifiersClassNames={{
              today: "sam-today",
            }}
            classNames={{
              root: "text-sam-text-2",
              month: "space-y-1",
              month_caption:
                "flex items-center justify-between px-1 text-xs font-semibold",
              nav: "flex items-center gap-1",
              button_previous:
                "h-7 w-7 rounded-md border border-sam-border text-sam-text-3 hover:bg-sam-surface-3 dark:hover:bg-sam-surface-2",
              button_next:
                "h-7 w-7 rounded-md border border-sam-border text-sam-text-3 hover:bg-sam-surface-3 dark:hover:bg-sam-surface-2",
              caption_label: "text-xs font-semibold text-sam-text-2",
              weekdays: "text-[10px] text-sam-text-3",
              weekday: "h-8 w-8 text-center",
              day: "h-8 w-8",
              day_button:
                "h-8 w-8 inline-flex items-center justify-center rounded-md text-xs hover:bg-sam-surface-3 dark:hover:bg-sam-surface-2",
              selected: "rounded-md bg-sam-solid text-sam-solid-fg hover:bg-slate-800 dark:hover:bg-slate-200",
              today: "text-sam-text-1",
            }}
          />

          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className="mt-1 w-full rounded-md border border-sam-border px-2 py-1 text-[11px] text-sam-text-3 dark:hover:bg-sam-surface-2"
          >
            Clear date
          </button>
        </div>
      ) : null}

      <style jsx global>{`
        .sam-date-picker .sam-today {
          border-radius: 0.375rem !important;
          box-shadow: inset 0 0 0 1px rgb(148 163 184) !important;
        }

        .sam-date-picker .sam-today > button {
          border-radius: 0.375rem !important;
          box-shadow: inset 0 0 0 1px rgb(148 163 184) !important;
        }

        .sam-date-picker .sam-today button {
          border-radius: 0.375rem !important;
          box-shadow: inset 0 0 0 1px rgb(148 163 184) !important;
        }
      `}</style>
    </div>
  );
}
