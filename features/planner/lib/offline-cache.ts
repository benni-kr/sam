/**
 * Offline snapshot cache.
 *
 * Keeps the last successfully loaded planner data in localStorage so the app can
 * still render its calendar and events when Supabase is unreachable. Snapshots
 * are deliberately kept in the state layer rather than the service worker: the
 * worker only handles same-origin requests (see public/sw.js), and a worker
 * cache would serve stale rows invisibly, whereas the UI needs to *know* the
 * data is stale in order to say so and to refuse writes.
 *
 * Snapshots are namespaced by planner scope, the same partitioning the Supabase
 * tables use, so switching NEXT_PUBLIC_SAM_PLANNER_SCOPE never hydrates one
 * environment from another's cache.
 */

import { getPlannerScope } from "@/features/planner/lib/planner-scope";

const STORAGE_PREFIX = "sam:offline";

export type OfflineSnapshot<T> = {
  /** ISO timestamp of the load this snapshot came from. */
  savedAt: string;
  payload: T;
};

function storageKey(key: string) {
  return `${STORAGE_PREFIX}:${getPlannerScope()}:${key}`;
}

/**
 * Reads a snapshot, or null when absent, unparseable, or storage is unavailable
 * (Safari private mode throws on access).
 */
export function readSnapshot<T>(key: string): OfflineSnapshot<T> | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey(key));

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as OfflineSnapshot<T>).savedAt !== "string" ||
      !("payload" in parsed) ||
      // A null payload is not usable data. Treat it as no snapshot at all so a
      // caller can never hydrate emptiness while reporting a sync time.
      (parsed as OfflineSnapshot<T>).payload == null
    ) {
      return null;
    }

    return parsed as OfflineSnapshot<T>;
  } catch {
    return null;
  }
}

/**
 * Stores a snapshot. Failures are swallowed: a full or unavailable localStorage
 * must never break an otherwise successful load.
 */
export function writeSnapshot<T>(key: string, payload: T) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const snapshot: OfflineSnapshot<T> = {
      savedAt: new Date().toISOString(),
      payload,
    };

    window.localStorage.setItem(storageKey(key), JSON.stringify(snapshot));
  } catch {
    // noop
  }
}

/**
 * Whether a failure means "the network is gone" rather than "the request was
 * rejected". Only the former should drop the app into offline mode; a 500 or a
 * misconfiguration must still surface as a real error.
 *
 * `fetch` rejects with a TypeError when it cannot reach the host at all, while
 * the persistence adapters throw plain Errors for non-ok responses.
 */
export function isOfflineError(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  return false;
}

/**
 * True when the browser currently reports no connectivity. `navigator.onLine`
 * only proves the *absence* of a connection reliably, which is exactly how it
 * is used here.
 */
export function isBrowserOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
