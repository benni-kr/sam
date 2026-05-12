"use client";

import type { FormEvent } from "react";

import { BaseEventForm } from "@/components/ui/base-event-form";
import { DatePicker } from "@/components/ui/date-picker";
import {
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
  participants: string[];
  availableParticipants: string[];
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: PlannerEventCategory) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
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
  participants,
  availableParticipants,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onStartDateChange,
  onEndDateChange,
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
        />
        <DatePicker
          value={endDate}
          onChange={onEndDateChange}
          placeholder="End date"
        />
      </div>
    </BaseEventForm>
  );
}
