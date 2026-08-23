/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  isOfflineError,
  readSnapshot,
  writeSnapshot,
} from "@/features/planner/lib/offline-cache";

// Scope defaults to "default" when NEXT_PUBLIC_SAM_PLANNER_SCOPE is unset.
const KEY = "sam:offline:default:probe";

describe("readSnapshot / writeSnapshot", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("round-trips a payload", () => {
    expect(writeSnapshot("probe", { a: 1 })).toBe(true);
    expect(readSnapshot<{ a: number }>("probe")?.payload).toEqual({ a: 1 });
  });

  it("discards a snapshot written by a different payload version", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ version: 0, savedAt: "2026-08-01T10:00:00.000Z", payload: { a: 1 } }),
    );

    expect(readSnapshot("probe")).toBeNull();
  });

  it("discards a snapshot with no version at all", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ savedAt: "2026-08-01T10:00:00.000Z", payload: { a: 1 } }),
    );

    expect(readSnapshot("probe")).toBeNull();
  });

  it("reports a failed write instead of failing silently", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });

    expect(writeSnapshot("probe", { a: 1 })).toBe(false);
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe("isOfflineError", () => {
  const onLine = (value: boolean) =>
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);

  beforeEach(() => {
    onLine(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("treats a browser that reports no connection as offline", () => {
    onLine(false);
    expect(isOfflineError(new Error("anything"))).toBe(true);
  });

  it.each([
    "Failed to fetch",
    "NetworkError when attempting to fetch resource.",
    "Load failed",
    "fetch failed",
  ])("recognises %j as a lost connection", (message) => {
    expect(isOfflineError(new TypeError(message))).toBe(true);
  });

  it("does not mistake a TypeError from our own code for being offline", () => {
    // The whole point of the message check: a bug inside a persistence adapter
    // must surface as a real error rather than quietly serving a stale snapshot
    // while the connection is perfectly fine.
    expect(
      isOfflineError(new TypeError("Cannot read properties of undefined (reading 'json')")),
    ).toBe(false);
  });

  it("does not treat a rejected request as offline", () => {
    expect(
      isOfflineError(new Error("Failed to load planner events from Supabase.")),
    ).toBe(false);
  });
});
