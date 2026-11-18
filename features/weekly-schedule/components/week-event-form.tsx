"use client";

import type { FormEvent } from "react";

import { BaseEventForm } from "@/components/ui/base-event-form";
import {
  getDefaultWeekAppointmentTimeRange,
  TimePicker,
} from "@/components/ui/time-picker";
import { BackgroundIcon } from "@/features/weekly-schedule/components/background-icon";
import {
  BACKGROUND_ICON_OPTIONS,
  getBackgroundIconKind,
} from "@/features/weekly-schedule/lib/week-category-config";
import {
  plannerWeekEventCategories,
  plannerWeekdays,
  type BackgroundIconKind,
  type PlannerWeekEventCategory,
  type PlannerWeekday,
} from "@/features/weekly-schedule/lib/week-types";

type PlannerWeekEventFormProps = {
  heading: string;
  submitLabel: string;
  title: string;
  description: string;
  category: PlannerWeekEventCategory;
  day: PlannerWeekday;
  icon?: BackgroundIconKind;
  startTime: string;
  endTime: string;
  participants: string[];
  availableParticipants: string[];
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: PlannerWeekEventCategory) => void;
  onDayChange: (value: PlannerWeekday) => void;
  onIconChange?: (value: BackgroundIconKind) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onParticipantsChange: (value: string[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

/**
 * Adapts the shared `BaseEventForm` for the weekly schedule domain.
 *
 * This wrapper injects the weekly domain constraints by adding weekday and
 * time controls, while still reusing the generic modal, title, and
 * participant handling from the base event form.
 */
export function PlannerWeekEventForm({
  heading,
  submitLabel,
  title,
  description,
  category,
  day,
  icon,
  startTime,
  endTime,
  participants,
  availableParticipants,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onDayChange,
  onIconChange,
  onStartTimeChange,
  onEndTimeChange,
  onParticipantsChange,
  onSubmit,
  onCancel,
}: PlannerWeekEventFormProps) {
  const normalizedTimeRange = getDefaultWeekAppointmentTimeRange(
    startTime,
    endTime,
  );
  const activeIconKind = getBackgroundIconKind(title, icon);

  function handleStartTimeChange(value: string) {
    onStartTimeChange(value);

    const nextRange = getDefaultWeekAppointmentTimeRange(value, endTime);
    // Keep the end time moving forward so we preserve the minimum 1-hour
    // duration rule and avoid negative or invalid time blocks when the
    // start time changes.
    onEndTimeChange(nextRange.endTime);
  }

  function handleEndTimeChange(value: string) {
    if (!startTime) {
      onStartTimeChange(normalizedTimeRange.startTime);
    }

    onEndTimeChange(value);
  }

  return (
    <BaseEventForm
      heading={heading}
      submitLabel={submitLabel}
      title={title}
      titlePlaceholder={
        category === "Background"
          ? "Background activity (e.g. Lunch)"
          : "Appointment name"
      }
      description={description}
      onDescriptionChange={onDescriptionChange}
      participants={participants}
      availableParticipants={availableParticipants}
      onTitleChange={onTitleChange}
      onParticipantsChange={onParticipantsChange}
      onSubmit={onSubmit}
      onCancel={onCancel}
      panelClassName="rounded-2xl p-5"
    >
      <select
        value={category}
        onChange={(event) => {
          const nextCategory = event.target.value as PlannerWeekEventCategory;
          onCategoryChange(nextCategory);
          if (
            nextCategory === "Background" &&
            !title.trim() &&
            !startTime &&
            !endTime
          ) {
            onStartTimeChange("12:00");
            onEndTimeChange("13:00");
          }
        }}
        required
        className="w-full rounded-md border border-sam-border bg-sam-surface px-2.5 py-1.5 text-sm text-sam-text-2 outline-none ring-slate-300 focus:ring dark:bg-sam-surface-2 dark:ring-slate-600"
      >
        {plannerWeekEventCategories.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-3 gap-2">
        <select
          value={day}
          onChange={(event) => onDayChange(event.target.value as PlannerWeekday)}
          required
          className="w-full rounded-md border border-sam-border bg-sam-surface px-2.5 py-1.5 text-xs text-sam-text-2 outline-none ring-slate-300 focus:ring dark:bg-sam-surface-2 dark:ring-slate-600"
        >
          {plannerWeekdays.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <TimePicker
          value={normalizedTimeRange.startTime}
          onChange={handleStartTimeChange}
          placeholder="Start time"
          earliestHour={6}
          latestHour={23}
          minuteStep={15}
        />
        <TimePicker
          value={normalizedTimeRange.endTime}
          onChange={handleEndTimeChange}
          placeholder="End time"
          earliestHour={6}
          latestHour={24}
          minuteStep={15}
          excludeBefore={normalizedTimeRange.startTime}
          align="right"
        />
      </div>

      {category === "Background" && onIconChange ? (
        <div className="rounded-md border border-sam-border bg-sam-surface p-2 dark:bg-sam-surface-2">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sam-text-3">
            Background icon
          </p>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {BACKGROUND_ICON_OPTIONS.map((option) => {
              const isSelected = activeIconKind === option.kind;
              return (
                <button
                  key={option.kind}
                  type="button"
                  onClick={() => onIconChange(option.kind)}
                  title={option.label}
                  aria-label={option.label}
                  aria-pressed={isSelected}
                  className={`flex h-9 items-center justify-center rounded-md border transition-colors ${
                    isSelected
                      ? "border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-400 dark:bg-amber-950/50 dark:text-amber-200"
                      : "border-sam-border bg-sam-surface text-sam-text-3 hover:bg-sam-surface-2 hover:text-sam-text-1 dark:bg-sam-surface"
                  }`}
                >
                  <BackgroundIcon kind={option.kind} className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </BaseEventForm>
  );
}
