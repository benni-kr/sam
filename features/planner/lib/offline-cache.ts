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

/**
 * Bump whenever the cached payload shape changes. Snapshots written by an older
 * build are then discarded instead of hydrating the app with data it can no
 * longer read — a stale shape would surface as corrupted events rather than as
 * a clean "no offline data" state.
 */
const SNAPSHOT_VERSION = 1;

export type OfflineSnapshot<T> = {
  version: number;
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
      // Written by a build with a different payload shape.
      (parsed as OfflineSnapshot<T>).version !== SNAPSHOT_VERSION ||
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
 * Stores a snapshot. Never throws: a full or unavailable localStorage must not
 * break an otherwise successful load. It does report the failure, though —
 * silently skipping the write would leave the app with no offline data and no
 * clue why, which is only discovered once the connection is already gone.
 *
 * @returns whether the snapshot was stored
 */
export function writeSnapshot<T>(key: string, payload: T) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const snapshot: OfflineSnapshot<T> = {
      version: SNAPSHOT_VERSION,
      savedAt: new Date().toISOString(),
      payload,
    };

    window.localStorage.setItem(storageKey(key), JSON.stringify(snapshot));
    return true;
  } catch (error) {
    // Typically QuotaExceededError, or a browser blocking storage entirely
    // (Safari private mode throws on access).
    console.warn(
      `[SAM offline] Could not cache "${key}" for offline use; the app will have no data if the connection drops.`,
      error,
    );
    return false;
  }
}

/**
 * The messages engines use when `fetch` cannot reach the host at all. Matching
 * on them is unpleasant but unavoidable: the spec gives every such failure the
 * same `TypeError` type, with no code or cause to branch on.
 */
const NETWORK_FAILURE_MESSAGES = [
  "failed to fetch", // Chromium
  "networkerror", // Firefox: "NetworkError when attempting to fetch resource."
  "load failed", // Safari
  "fetch failed", // undici (Node, and Next's server runtime)
  "network request failed",
];

/**
 * Whether a failure means "the network is gone" rather than "the request was
 * rejected". Only the former may drop the app into offline mode; a 500, an RLS
 * rejection or a misconfiguration must still surface as a real error.
 *
 * Deliberately narrower than `error instanceof TypeError`: a TypeError raised by
 * a bug of our own inside a persistence adapter — a misspelled property, say —
 * would otherwise be read as a lost connection, and the app would quietly serve
 * a stale snapshot while perfectly online. Showing a real error is the safer
 * failure mode, so anything unrecognised falls through.
 */
export function isOfflineError(error: unknown) {
  if (isBrowserOffline()) {
    return true;
  }

  if (!(error instanceof TypeError)) {
    return false;
  }

  const message = error.message.toLocaleLowerCase();

  return NETWORK_FAILURE_MESSAGES.some((known) => message.includes(known));
}

/**
 * True when the browser currently reports no connectivity. `navigator.onLine`
 * only proves the *absence* of a connection reliably, which is exactly how it
 * is used here.
 */
export function isBrowserOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
