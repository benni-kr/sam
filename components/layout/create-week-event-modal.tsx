"use client";

import type { FormEvent } from "react";

import { PlannerWeekEventForm } from "@/features/weekly-schedule/components/week-event-form";
import {
  type PlannerWeekEventCategory,
  type PlannerWeekday,
} from "@/features/weekly-schedule/lib/week-types";

type CreateWeekEventModalProps = {
  isOpen: boolean;
  heading: string;
  submitLabel: string;
  title: string;
  description: string;
  category: PlannerWeekEventCategory;
  day: PlannerWeekday;
  startTime: string;
  endTime: string;
  participants: string[];
  availableParticipants: string[];
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: PlannerWeekEventCategory) => void;
  onDayChange: (value: PlannerWeekday) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onParticipantsChange: (value: string[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function CreateWeekEventModal({
  isOpen,
  heading,
  submitLabel,
  title,
  description,
  category,
  day,
  startTime,
  endTime,
  participants,
  availableParticipants,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onDayChange,
  onStartTimeChange,
  onEndTimeChange,
  onParticipantsChange,
  onSubmit,
  onCancel,
}: CreateWeekEventModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <PlannerWeekEventForm
      heading={heading}
      submitLabel={submitLabel}
      title={title}
      description={description}
      category={category}
      day={day}
      startTime={startTime}
      endTime={endTime}
      participants={participants}
      availableParticipants={availableParticipants}
      onTitleChange={onTitleChange}
      onDescriptionChange={onDescriptionChange}
      onCategoryChange={onCategoryChange}
      onDayChange={onDayChange}
      onStartTimeChange={onStartTimeChange}
      onEndTimeChange={onEndTimeChange}
      onParticipantsChange={onParticipantsChange}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
