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
        className={`w-full max-w-md border border-slate-200 bg-white shadow-2xl ${panelClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              {heading}
            </p>
          </div>

          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={titlePlaceholder}
            maxLength={40}
            required
            className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none ring-slate-300 focus:ring"
          />

          {children}

          <div className="rounded-md border border-slate-200 bg-white p-2">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
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
