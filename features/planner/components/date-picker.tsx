"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import { DayPicker } from "react-day-picker";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

/**
 * Lightweight date picker with a custom popover calendar.
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
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-xs text-slate-700 outline-none ring-slate-300 focus:ring"
      >
        {selectedDate ? format(selectedDate, "MMM d, yyyy") : placeholder}
      </button>

      {isOpen ? (
        <div className="absolute z-30 mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <DayPicker
            mode="single"
            locale={enGB}
            selected={selectedDate}
            onDayClick={(_, __, event) => {
              // Prevent form submission when day buttons are clicked inside forms.
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
              root: "text-slate-700",
              month: "space-y-1",
              month_caption:
                "flex items-center justify-between px-1 text-xs font-semibold",
              nav: "flex items-center gap-1",
              button_previous:
                "h-7 w-7 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100",
              button_next:
                "h-7 w-7 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100",
              caption_label: "text-xs font-semibold text-slate-700",
              weekdays: "text-[10px] text-slate-500",
              weekday: "h-8 w-8 text-center",
              day: "h-8 w-8",
              day_button:
                "h-8 w-8 inline-flex items-center justify-center rounded-md text-xs hover:bg-slate-100",
              selected: "rounded-md bg-slate-900 text-white hover:bg-slate-900",
              today: "text-slate-800",
            }}
          />

          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600"
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
