"use client";

import { createContext, useContext } from "react";

type CreateEventContextValue = {
  openCreateEvent: (dateKey?: string) => void;
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

export function useCreateEvent() {
  const context = useContext(CreateEventContext);

  if (!context) {
    throw new Error("useCreateEvent must be used within CreateEventProvider");
  }

  return context;
}
