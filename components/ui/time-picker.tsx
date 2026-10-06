import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * Props for `TimePicker`.
 *
 * `value`, `onChange`, and `excludeBefore` operate on 24-hour strings in
 * the "HH:MM" format. `onChange` will be called with a string in the same
 * format when the selection changes (for example: "09:30").
 */
type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  earliestHour?: number;
  latestHour?: number;
  minuteStep?: number;
  excludeBefore?: string;
  clearable?: boolean;
  disabled?: boolean;
  align?: "left" | "right";
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const safeMinutes = Math.max(0, Math.min(24 * 60, minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  return `${pad(hours)}:${pad(remainder)}`;
}

function buildTimeOptions(
  earliestHour: number,
  latestHour: number,
  minuteStep: number,
) {
  const options: string[] = [];

  for (let hour = earliestHour; hour <= latestHour; hour += 1) {
    for (let minute = 0; minute < 60; minute += minuteStep) {
      const time = minutesToTime(hour * 60 + minute);

      // Only stop minutes from generating if the hour is strictly 24 (midnight)
      // This allows latestHour={23} to generate 23:00, 23:15, 23:30, 23:45.
      if (hour === 24 && minute > 0) {
        continue;
      }

      options.push(time);
    }
  }

  return options;
}

function deriveSelection(options: string[], value: string) {
  if (value && options.includes(value)) {
    return value;
  }

  return "";
}

/**
 * Normalized step-based time picker.
 *
 * Provides a dropdown of times in regular steps (controlled by
 * `minuteStep`) and avoids inconsistencies across native HTML time inputs
 * which vary in styling and browser behavior. Values are normalized to the
 * "HH:MM" 24-hour format.
 */
export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  earliestHour = 0,
  latestHour = 24,
  minuteStep = 15,
  excludeBefore,
  clearable = false,
  disabled = false,
  align = "left",
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo(
    () => buildTimeOptions(earliestHour, latestHour, minuteStep),
    [earliestHour, latestHour, minuteStep],
  );

  const availableOptions = useMemo(() => {
    if (!excludeBefore) {
      return options;
    }

    const cutoff = timeToMinutes(excludeBefore);

    return options.filter((option) => timeToMinutes(option) > cutoff);
  }, [excludeBefore, options]);

  const selectedValue = deriveSelection(availableOptions, value);

  useEffect(() => {
    if (value && excludeBefore && timeToMinutes(value) <= timeToMinutes(excludeBefore)) {
      onChange("");
    }
  }, [value, excludeBefore, onChange]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
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

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex w-full items-center justify-between rounded-md border border-sam-border bg-sam-surface px-2.5 py-1.5 text-xs text-sam-text-2 outline-none transition-colors dark:bg-sam-surface-2 ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "hover:bg-sam-surface-2 focus-within:ring focus-within:ring-slate-300 dark:hover:bg-slate-700 dark:focus-within:ring-slate-600"
        }`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((current) => !current)}
          className={`flex-1 text-left outline-none ${disabled ? "cursor-not-allowed" : ""}`}
        >
          <span className={selectedValue ? "text-sam-text-1" : "text-sam-text-4"}>
            {selectedValue || placeholder}
          </span>
        </button>

        {clearable && selectedValue && !disabled ? (
          <button
            type="button"
            title="Clear time"
            aria-label="Clear time"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setIsOpen(false);
            }}
            className="ml-1 rounded p-0.5 text-sam-text-4 hover:bg-sam-surface-3 hover:text-sam-text-1"
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {isOpen && !disabled ? (
        <div
          className={`absolute top-full z-30 mt-1 w-[11rem] overflow-hidden rounded-lg border border-sam-border bg-sam-surface shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="border-b border-sam-border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sam-text-4 dark:border-slate-800">
            Time
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {clearable && selectedValue ? (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="mb-1 flex w-full items-center justify-between rounded-md border-b border-sam-border px-2 py-1.5 text-left text-xs text-rose-500 transition-colors hover:bg-rose-500/10"
              >
                <span>Clear time</span>
              </button>
            ) : null}
            {availableOptions.map((option) => {
              const isSelected = option === selectedValue;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-sam-solid text-sam-solid-fg"
                      : "text-sam-text-2 hover:bg-sam-surface-3 dark:hover:bg-sam-surface-2"
                  }`}
                >
                  <span>{option}</span>
                  {isSelected ? (
                    <span className="text-[10px] uppercase tracking-[0.2em]">
                      Selected
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Normalize and enforce a sensible default time range for weekly appointments.
 *
 * This helper ensures a minimum one-hour duration for events to avoid
 * zero-height or negative-height rendering bugs in the timetable grid. It
 * clamps start times to a sensible earliest start and guarantees the end
 * time is at least one hour after the normalized start.
 */
export function getDefaultWeekAppointmentTimeRange(
  startTime?: string,
  endTime?: string,
) {
  const earliestStart = "06:00";
  const midnight = 24 * 60; // hard ceiling — events must not cross midnight

  const start =
    startTime && timeToMinutes(startTime) >= timeToMinutes(earliestStart)
      ? startTime
      : earliestStart;

  const startMinutes = timeToMinutes(start);

  // Minimum end is 1 hour after start, but never past midnight.
  const minimumEndMinutes = Math.min(startMinutes + 60, midnight);
  const minimumEnd = minutesToTime(minimumEndMinutes);

  // Accept a supplied end time only when it is strictly after start and
  // does not cross midnight.
  const endMinutes = endTime ? timeToMinutes(endTime) : null;
  const normalizedEnd =
    endMinutes !== null && endMinutes > startMinutes && endMinutes <= midnight
      ? endTime!
      : minimumEnd;

  return {
    startTime: start,
    endTime: normalizedEnd,
  };
}
