"use client";

/**
 * Global UI Command Center for create/manage actions.
 *
 * This context lets deep-nested components (for example, a specific day cell
 * in the calendar) trigger the creation and management modals that are
 * physically rendered and controlled by the AppShell.
 */

import { createContext, useContext } from "react";
import type { PlannerWeekday } from "@/features/weekly-schedule/lib/week-types";

/**
 * Imperative modal-trigger commands exposed through the AppShell.
 *
 * These functions do not only "create" data; they drive the visibility state
 * of the modal forms so the shell can open the correct editor from anywhere in
 * the planner UI.
 */
type CreateEventContextValue = {
  openCreateEvent: (dateKey?: string) => void;
  openCreateWeekEvent: (day?: PlannerWeekday) => void;
  openManageFriends: () => void;
};

const CreateEventContext = createContext<CreateEventContextValue | null>(null);

export function CreateEventProvider({
  value,
  children,
}: {
  value: CreateEventContextValue;
  children: React.ReactNode;
}) {
  return (
    <CreateEventContext.Provider value={value}>
      {children}
    </CreateEventContext.Provider>
  );
}

/**
 * Returns the active create-event command center for planner consumers.
 */
export function useCreateEvent() {
  const context = useContext(CreateEventContext);

  if (!context) {
    throw new Error("useCreateEvent must be used within CreateEventProvider");
  }

  return context;
}
