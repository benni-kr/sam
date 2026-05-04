"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  earliestHour?: number;
  latestHour?: number;
  minuteStep?: number;
  excludeBefore?: string;
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

      // FIX: Only stop minutes from generating if the hour is strictly 24 (midnight)
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

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  earliestHour = 6,
  latestHour = 24,
  minuteStep = 15,
  excludeBefore,
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
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none ring-slate-300 transition-colors hover:bg-slate-50 focus:ring"
      >
        <span className={selectedValue ? "text-slate-900" : "text-slate-400"}>
          {selectedValue || placeholder}
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-[11rem] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Time
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
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
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
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

export function getDefaultWeekAppointmentTimeRange(
  startTime?: string,
  endTime?: string,
) {
  const earliestStart = "06:00";
  const oneHourLater = "07:00";

  const start =
    startTime && timeToMinutes(startTime) >= timeToMinutes(earliestStart)
      ? startTime
      : earliestStart;

  const minimumEnd = minutesToTime(timeToMinutes(start) + 60);

  const normalizedEnd =
    endTime && timeToMinutes(endTime) > timeToMinutes(start)
      ? endTime
      : minimumEnd;

  return {
    startTime: start,
    endTime:
      timeToMinutes(normalizedEnd) > timeToMinutes(start)
        ? normalizedEnd
        : oneHourLater,
  };
}
