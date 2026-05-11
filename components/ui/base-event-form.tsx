"use client";

import { useState, type FormEvent, type ReactNode } from "react";

/**
 * Configures an inline, two-step deletion confirmation block used by event
 * forms. Supplying this object renders a compact confirmation UI inside the
 * form (avoiding native browser alerts). The UI displays `prompt` and two
 * actions: a cancel button (labelled by `cancelLabel` or defaulting to
 * "Keep") and a confirm button (labelled by `confirmLabel`) which invokes
 * `onDelete` when pressed.
 */
export type DeleteAction = {
  label: string;
  prompt: string;
  confirmLabel: string;
  cancelLabel?: string;
  onDelete: () => void;
};

type BaseEventFormProps = {
  heading: string;
  submitLabel: string;
  title: string;
  titlePlaceholder: string;
  participants: string[];
  availableParticipants: string[];
  onTitleChange: (value: string) => void;
  onParticipantsChange: (value: string[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  children: ReactNode;
  deleteAction?: DeleteAction;
  panelClassName?: string;
};

/**
 * Shared modal scaffolding for event forms.
 *
 * Renders the common modal overlay, heading, title input, and participant
 * selection used across different event types. Domain-specific inputs
 * (for example: calendar date pickers or weekly timeslot selectors) should
 * be provided via the `children` prop so each form can extend this base UI.
 */
export function BaseEventForm({
  heading,
  submitLabel,
  title,
  titlePlaceholder,
  participants,
  availableParticipants,
  onTitleChange,
  onParticipantsChange,
  onSubmit,
  onCancel,
  children,
  deleteAction,
  panelClassName = "rounded-2xl p-5",
}: BaseEventFormProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  function handleDelete() {
    deleteAction?.onDelete();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
      onClick={onCancel}
    >
      <section
        className={`w-full max-w-md border border-sam-border bg-sam-surface shadow-2xl ${panelClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sam-text-3">
              {heading}
            </p>
          </div>

          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={titlePlaceholder}
            maxLength={40}
            required
            className="w-full rounded-md border border-sam-border bg-sam-surface px-2.5 py-1.5 text-sm text-sam-text-2 outline-none ring-slate-300 focus:ring dark:bg-sam-surface-2 dark:ring-slate-600 dark:placeholder:text-slate-500"
          />

          {children}

          <div className="rounded-md border border-sam-border bg-sam-surface p-2 dark:bg-sam-surface-2">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sam-text-3">
              Participants
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {availableParticipants.map((participantName) => {
                const isSelected = participants.includes(participantName);

                return (
                  <button
                    key={participantName}
                    type="button"
                    onClick={() => {
                      onParticipantsChange(
                        isSelected
                          ? participants.filter(
                              (name) => name !== participantName,
                            )
                          : [...participants, participantName],
                      );
                    }}
                    className={`rounded-sm border px-2 py-1 text-left text-xs transition-colors ${
                      isSelected
                        ? "border-sam-border-2 bg-sam-surface-3 text-sam-text-1 dark:border-slate-500 dark:bg-slate-600"
                        : "border-sam-border bg-sam-surface text-sam-text-2 hover:bg-sam-surface-2 dark:bg-sam-surface-2 dark:hover:bg-slate-600"
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
              className="flex-1 rounded-md border border-sam-border bg-sam-surface px-3 py-2 text-sm text-sam-text-2 dark:bg-sam-surface-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-sam-solid px-3 py-2 text-sm font-medium text-sam-solid-fg transition-colors hover:bg-slate-700 dark:hover:bg-slate-200"
            >
              {submitLabel}
            </button>
          </div>

          {deleteAction ? (
            <>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
              >
                {deleteAction.label}
              </button>

              {isDeleteConfirmOpen ? (
                <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                  <p className="text-center text-sm font-medium text-red-800 dark:text-red-300">
                    {deleteAction.prompt}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDeleteConfirmOpen(false)}
                      className="flex-1 rounded-md border border-sam-border bg-sam-surface px-3 py-2 text-sm text-sam-text-2 dark:bg-sam-surface-2"
                    >
                      {deleteAction.cancelLabel ?? "Keep"}
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
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
      </section>
    </div>
  );
}
