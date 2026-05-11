"use client";

import type { FormEvent } from "react";

import {
  BaseEventForm,
  type DeleteAction,
} from "@/components/ui/base-event-form";
import {
  getDefaultWeekAppointmentTimeRange,
  TimePicker,
} from "@/components/ui/time-picker";
import {
  plannerWeekEventCategories,
  plannerWeekdays,
  type PlannerWeekEventCategory,
  type PlannerWeekday,
} from "@/features/weekly-schedule/lib/week-types";

type PlannerWeekEventFormProps = {
  heading: string;
  submitLabel: string;
  title: string;
  category: PlannerWeekEventCategory;
  day: PlannerWeekday;
  startTime: string;
  endTime: string;
  participants: string[];
  availableParticipants: string[];
  onTitleChange: (value: string) => void;
  onCategoryChange: (value: PlannerWeekEventCategory) => void;
  onDayChange: (value: PlannerWeekday) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onParticipantsChange: (value: string[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  deleteAction?: DeleteAction;
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
  category,
  day,
  startTime,
  endTime,
  participants,
  availableParticipants,
  onTitleChange,
  onCategoryChange,
  onDayChange,
  onStartTimeChange,
  onEndTimeChange,
  onParticipantsChange,
  onSubmit,
  onCancel,
  deleteAction,
}: PlannerWeekEventFormProps) {
  const normalizedTimeRange = getDefaultWeekAppointmentTimeRange(
    startTime,
    endTime,
  );

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
      titlePlaceholder="Weekly appointment"
      participants={participants}
      availableParticipants={availableParticipants}
      onTitleChange={onTitleChange}
      onParticipantsChange={onParticipantsChange}
      onSubmit={onSubmit}
      onCancel={onCancel}
      deleteAction={deleteAction}
      panelClassName="rounded-2xl p-5"
    >
      <select
        value={category}
        onChange={(event) =>
          onCategoryChange(event.target.value as PlannerWeekEventCategory)
        }
        required
        className="w-full rounded-md border border-sam-border bg-sam-surface px-2.5 py-1.5 text-sm text-sam-text-2 outline-none ring-slate-300 focus:ring dark:bg-sam-surface-2 dark:ring-slate-600"
      >
        {plannerWeekEventCategories.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <select
        value={day}
        onChange={(event) => onDayChange(event.target.value as PlannerWeekday)}
        required
        className="w-full rounded-md border border-sam-border bg-sam-surface px-2.5 py-1.5 text-sm text-sam-text-2 outline-none ring-slate-300 focus:ring dark:bg-sam-surface-2 dark:ring-slate-600"
      >
        {plannerWeekdays.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2">
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
        />
      </div>
    </BaseEventForm>
  );
}
