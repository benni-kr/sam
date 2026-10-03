"use client";

import type { FormEvent } from "react";

import { BaseEventForm } from "@/components/ui/base-event-form";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import {
  MIN_PLANNER_DATE,
  plannerEventCategories,
  type PlannerEventCategory,
} from "@/features/planner/lib/planner";

type PlannerEventFormProps = {
  heading: string;
  submitLabel: string;
  title: string;
  description: string;
  category: PlannerEventCategory;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  participants: string[];
  availableParticipants: string[];
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: PlannerEventCategory) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onStartTimeChange?: (value: string) => void;
  onEndTimeChange?: (value: string) => void;
  onParticipantsChange: (value: string[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

/**
 * Adapts the generic `BaseEventForm` specifically for the Calendar domain.
 *
 * This wrapper injects chronological date controls so planner events can be
 * created and edited with Calendar-specific start/end date inputs while still
 * reusing the shared modal, title, and participant scaffolding.
 */
export function PlannerEventForm({
  heading,
  submitLabel,
  title,
  description,
  category,
  startDate,
  endDate,
  startTime,
  endTime,
  participants,
  availableParticipants,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onStartDateChange,
  onEndDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onParticipantsChange,
  onSubmit,
  onCancel,
}: PlannerEventFormProps) {
  return (
    <BaseEventForm
      heading={heading}
      submitLabel={submitLabel}
      title={title}
      titlePlaceholder="Event name"
      description={description}
      onDescriptionChange={onDescriptionChange}
      participants={participants}
      availableParticipants={availableParticipants}
      onTitleChange={onTitleChange}
      onParticipantsChange={onParticipantsChange}
      onSubmit={onSubmit}
      onCancel={onCancel}
      panelClassName="rounded-xl p-4"
    >
      <select
        value={category}
        onChange={(event) =>
          onCategoryChange(event.target.value as PlannerEventCategory)
        }
        required
        className="w-full rounded-lg border border-sam-border bg-sam-surface px-3 py-2 text-sm text-sam-text-2 outline-none ring-slate-300 focus:ring dark:bg-sam-surface-2 dark:ring-slate-600"
      >
        {plannerEventCategories.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {/* We intentionally omit `required` on these date inputs so users can
          create undated Inbox events and schedule them later. */}
      <div className="grid grid-cols-2 gap-2">
        <DatePicker
          value={startDate}
          onChange={onStartDateChange}
          placeholder="Start date"
          minDate={MIN_PLANNER_DATE}
        />
        <DatePicker
          value={endDate}
          onChange={onEndDateChange}
          placeholder="End date"
          minDate={MIN_PLANNER_DATE}
        />
      </div>

      {onStartTimeChange && onEndTimeChange ? (
        <div className="grid grid-cols-2 gap-2">
          <TimePicker
            value={startTime ?? ""}
            onChange={onStartTimeChange}
            placeholder="Start time"
            earliestHour={0}
            latestHour={24}
            clearable
            disabled={!startDate}
          />
          <TimePicker
            value={endTime ?? ""}
            onChange={onEndTimeChange}
            placeholder="End time"
            earliestHour={0}
            latestHour={24}
            excludeBefore={startDate === endDate ? startTime : undefined}
            clearable
            disabled={!startDate || !startTime}
          />
        </div>
      ) : null}
    </BaseEventForm>
  );
}
