"use client";

import { useState, type FormEvent } from "react";

import { DatePicker } from "@/components/planner/date-picker";
import {
  plannerEventCategories,
  type PlannerEventCategory,
} from "@/lib/planner";

type DeleteAction = {
  label: string;
  prompt: string;
  confirmLabel: string;
  onDelete: () => void;
};

type PlannerEventFormProps = {
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
  deleteAction?: DeleteAction;
};

/**
 * Shared planner event form used for creating and editing events.
 */
export function PlannerEventForm({
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
  deleteAction,
}: PlannerEventFormProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  function handleDelete() {
    deleteAction?.onDelete();
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
        placeholder="Event name"
        required
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-slate-300 focus:ring"
      />

      <select
        value={category}
        onChange={(event) =>
          onCategoryChange(event.target.value as PlannerEventCategory)
        }
        required
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-slate-300 focus:ring"
      >
        {plannerEventCategories.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

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

      <input
        value={participants.join(", ")}
        readOnly
        placeholder="No participants selected"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
      />

      <div className="rounded-lg border border-slate-200 bg-white p-2">
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
                className={`rounded-md border px-2 py-1 text-left text-xs transition-colors ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white"
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
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          {submitLabel}
        </button>
      </div>

      {deleteAction ? (
        <>
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            {deleteAction.label}
          </button>

          {isDeleteConfirmOpen ? (
            <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">
                {deleteAction.prompt}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  Keep event
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
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
