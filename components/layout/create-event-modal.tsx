"use client";

import type { FormEvent } from "react";

import { PlannerEventForm } from "@/features/planner/components/event-form";
import type { PlannerEventCategory } from "@/features/planner/lib/planner";

type CreateEventModalProps = {
  isOpen: boolean;
  heading: string;
  submitLabel: string;
  title: string;
  category: PlannerEventCategory;
  startDate: string;
  endDate: string;
  participants: string[];
  availableParticipants: string[];
  onTitleChange: (value: string) => void;
  onCategoryChange: (value: PlannerEventCategory) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onParticipantsChange: (value: string[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function CreateEventModal({
  isOpen,
  heading,
  submitLabel,
  title,
  category,
  startDate,
  endDate,
  participants,
  availableParticipants,
  onTitleChange,
  onCategoryChange,
  onStartDateChange,
  onEndDateChange,
  onParticipantsChange,
  onSubmit,
  onCancel,
}: CreateEventModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <PlannerEventForm
      heading={heading}
      submitLabel={submitLabel}
      title={title}
      category={category}
      startDate={startDate}
      endDate={endDate}
      participants={participants}
      availableParticipants={availableParticipants}
      onTitleChange={onTitleChange}
      onCategoryChange={onCategoryChange}
      onStartDateChange={onStartDateChange}
      onEndDateChange={onEndDateChange}
      onParticipantsChange={onParticipantsChange}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
