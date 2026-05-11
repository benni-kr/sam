"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import { createPortal } from "react-dom";

/**
 * Props for `DatePicker`.
 *
 * The component accepts and returns dates in `YYYY-MM-DD` format so it can be
 * used consistently for calendar events, birthdays, and any other date-only
 * field in the app.
 */
type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  clearLabel?: string;
  clearable?: boolean;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  popoverClassName?: string;
};

type PopoverPosition = {
  top: number;
  left: number;
};

const MIN_YEAR = 1950;
const MAX_YEAR = 2100;
const POPOVER_MARGIN = 8;
const POPOVER_GAP = 6;

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Lightweight date picker with a custom popover calendar.
 *
 * This avoids the browser inconsistencies of the native date input while
 * keeping the date-only workflow shared across the app.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  clearLabel = "Clear date",
  clearable = true,
  ariaLabel,
  className,
  buttonClassName,
  popoverClassName,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const selectedDate = useMemo(() => {
    if (!value) {
      return undefined;
    }

    const parsedDate = parseISO(value);

    return isValid(parsedDate) ? parsedDate : undefined;
  }, [value]);

  const [displayMonth, setDisplayMonth] = useState<Date>(
    selectedDate ?? new Date(),
  );

  const yearOptions = useMemo(
    () =>
      Array.from(
        { length: MAX_YEAR - MIN_YEAR + 1 },
        (_, idx) => MIN_YEAR + idx,
      ),
    [],
  );

  function updatePopoverPosition() {
    const anchor = containerRef.current;
    const popover = popoverRef.current;

    if (!anchor || !popover) {
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = anchorRect.left;

    if (left + popoverRect.width > viewportWidth - POPOVER_MARGIN) {
      left = viewportWidth - POPOVER_MARGIN - popoverRect.width;
    }
    left = Math.max(POPOVER_MARGIN, left);

    const belowTop = anchorRect.bottom + POPOVER_GAP;
    const aboveTop = anchorRect.top - popoverRect.height - POPOVER_GAP;
    const canPlaceBelow =
      belowTop + popoverRect.height <= viewportHeight - POPOVER_MARGIN;

    let top = canPlaceBelow ? belowTop : aboveTop;

    if (top < POPOVER_MARGIN) {
      top = POPOVER_MARGIN;
    }

    setPosition({ top, left });
  }

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePopoverPosition();

    const handleViewportChange = () => updatePopoverPosition();

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, displayMonth]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      const targetNode = event.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(targetNode) &&
        (!popoverRef.current || !popoverRef.current.contains(targetNode))
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
    <div
      ref={containerRef}
      className={`sam-date-picker relative ${className ?? ""}`}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => {
          if (!isOpen) {
            setDisplayMonth(selectedDate ?? new Date());
          }
          setIsOpen(!isOpen);
        }}
        className={`w-full rounded-lg border border-sam-border bg-sam-surface px-2 py-1.5 text-left text-xs text-sam-text-2 outline-none ring-slate-300 focus:ring dark:bg-sam-surface-2 dark:ring-slate-600 ${buttonClassName ?? ""}`}
      >
        {selectedDate ? format(selectedDate, "MMM d, yyyy") : placeholder}
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              className={`fixed z-[70] rounded-xl border border-sam-border bg-sam-surface p-2 shadow-xl ${popoverClassName ?? ""}`}
              style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                visibility: position ? "visible" : "hidden",
              }}
            >
              <div className="mb-2 grid grid-cols-[1fr_1fr] gap-1">
                <select
                  value={displayMonth.getMonth()}
                  onChange={(event) => {
                    const nextMonth = Number(event.target.value);
                    setDisplayMonth(
                      new Date(displayMonth.getFullYear(), nextMonth, 1),
                    );
                  }}
                  className="rounded-md border border-sam-border bg-sam-surface px-2 py-1 text-xs text-sam-text-2 outline-none ring-slate-300 focus:ring dark:bg-sam-surface-2 dark:ring-slate-600"
                >
                  {MONTH_LABELS.map((monthLabel, monthIndex) => (
                    <option key={monthLabel} value={monthIndex}>
                      {monthLabel}
                    </option>
                  ))}
                </select>
                <select
                  value={displayMonth.getFullYear()}
                  onChange={(event) => {
                    const nextYear = Number(event.target.value);
                    setDisplayMonth(
                      new Date(nextYear, displayMonth.getMonth(), 1),
                    );
                  }}
                  className="rounded-md border border-sam-border bg-sam-surface px-2 py-1 text-xs text-sam-text-2 outline-none ring-slate-300 focus:ring dark:bg-sam-surface-2 dark:ring-slate-600"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <DayPicker
                mode="single"
                locale={enGB}
                showOutsideDays={false}
                month={displayMonth}
                onMonthChange={setDisplayMonth}
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
                  month_caption: "hidden",
                  nav: "flex items-center gap-1",
                  chevron: "fill-sam-text-3 dark:fill-slate-200",
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
                  selected:
                    "rounded-md bg-sam-solid text-sam-solid-fg hover:bg-slate-800 dark:hover:bg-slate-200",
                  today: "text-sam-text-1",
                }}
              />

              {clearable ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                  }}
                  className="mt-1 w-full rounded-md border border-sam-border px-2 py-1 text-[11px] text-sam-text-3 dark:hover:bg-sam-surface-2"
                >
                  {clearLabel}
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}

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
