"use client";

import { useState, type FormEvent } from "react";

import {
  TimePicker,
  getDefaultWeekAppointmentTimeRange,
} from "@/features/planner/components/time-picker";
import {
  plannerWeekEventCategories,
  plannerWeekdays,
  type PlannerWeekEventCategory,
  type PlannerWeekday,
} from "@/features/planner/lib/planner";

type DeleteAction = {
  label: string;
  prompt: string;
  confirmLabel: string;
  onDelete: () => void;
};

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
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const normalizedTimeRange = getDefaultWeekAppointmentTimeRange(
    startTime,
    endTime,
  );

  function handleStartTimeChange(value: string) {
    onStartTimeChange(value);

    const nextRange = getDefaultWeekAppointmentTimeRange(value, endTime);
    onEndTimeChange(nextRange.endTime);
  }

  function handleEndTimeChange(value: string) {
    if (!startTime) {
      onStartTimeChange(normalizedTimeRange.startTime);
    }

    onEndTimeChange(value);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {heading}
        </p>
      </div>

      <input
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Weekly appointment"
        maxLength={40}
        required
        className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none ring-slate-300 focus:ring"
      />

      <select
        value={category}
        onChange={(event) =>
          onCategoryChange(event.target.value as PlannerWeekEventCategory)
        }
        required
        className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none ring-slate-300 focus:ring"
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
        className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none ring-slate-300 focus:ring"
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

      <div className="rounded-md border border-slate-200 bg-white p-2">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Participants
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1">
          {availableParticipants.map((participantName) => {
            const isSelected = participants.includes(participantName);

            return (
              <button
                key={participantName}
                type="button"
                onClick={() => {
                  onParticipantsChange(
                    isSelected
                      ? participants.filter((name) => name !== participantName)
                      : [...participants, participantName],
                  );
                }}
                className={`rounded-sm border px-2 py-1 text-left text-xs transition-colors ${
                  isSelected
                    ? "border-slate-300 bg-slate-100 text-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {participantName}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          {submitLabel}
        </button>
      </div>

      {deleteAction ? (
        <>
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            {deleteAction.label}
          </button>

          {isDeleteConfirmOpen ? (
            <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-center text-sm font-medium text-red-800">
                {deleteAction.prompt}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  Keep appointment
                </button>
                <button
                  type="button"
                  onClick={deleteAction.onDelete}
                  className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  {deleteAction.confirmLabel}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </form>
  );
}
