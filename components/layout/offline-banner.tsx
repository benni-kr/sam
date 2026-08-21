"use client";

/**
 * Offline notice.
 *
 * Shown when planner data came from the local snapshot instead of Supabase.
 * SAM is read-only in that state — persisting cache-hydrated state would prune
 * rows that exist on the server — so the banner has to make both facts clear:
 * the data is a snapshot, and editing is off.
 */

import { format, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import { CloudOff } from "lucide-react";

import { usePlannerState } from "@/features/planner/state/planner-state";

function formatSyncedAt(isoTimestamp: string) {
  try {
    return format(parseISO(isoTimestamp), "d MMM, HH:mm", { locale: enGB });
  } catch {
    return null;
  }
}

export function OfflineBanner() {
  const { isOffline, lastSyncedAt } = usePlannerState();

  if (!isOffline) {
    return null;
  }

  const syncedAt = lastSyncedAt ? formatSyncedAt(lastSyncedAt) : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-2xl border border-red-400/60 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm dark:border-red-500/40 dark:bg-red-950 dark:text-red-100"
    >
      <CloudOff className="h-5 w-5 flex-none" aria-hidden="true" />
      <p className="min-w-0">
        <span className="font-semibold">You are offline.</span>{" "}
        {syncedAt ? (
          <>Showing the last synced data from {syncedAt}.</>
        ) : (
          <>No saved data available yet.</>
        )}{" "}
        Editing is disabled until the connection returns.
      </p>
    </div>
  );
}
