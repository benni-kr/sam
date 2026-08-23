/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { FriendsProvider } from "@/features/friends/state/friends-state";
import {
  PlannerStateProvider,
  usePlannerState,
} from "@/features/planner/state/planner-state";
import { defaultPlannerSemesterId } from "@/features/planner/lib/planner";

const emptySemesters = { "spring-2026": [], "fall-2026": [] };

const cachedEvent = {
  id: "cached-1",
  title: "Cached exam",
  category: "Exam" as const,
  startDate: "2026-03-02",
  endDate: "2026-03-02",
  participants: [],
};

const mocks = vi.hoisted(() => ({
  loadFriends: vi.fn(),
  saveFriends: vi.fn(async () => {}),
  loadPlanner: vi.fn(),
  savePlanner: vi.fn(async () => {}),
  loadWeek: vi.fn(),
  saveWeek: vi.fn(async () => {}),
}));

vi.mock("@/features/friends/lib/friends-persistence", () => ({
  getDefaultFriends: vi.fn(() => []),
  resolveFriendsStore: () => ({
    loadFriends: mocks.loadFriends,
    saveFriends: mocks.saveFriends,
  }),
  // friends-state imports these directly, not through the store.
  loadFriends: mocks.loadFriends,
  saveFriends: mocks.saveFriends,
}));

vi.mock("@/features/planner/lib/planner-persistence", () => ({
  getDefaultEventsBySemester: vi.fn(() => emptySemesters),
  resolvePlannerEventStore: () => ({
    loadEventsBySemester: mocks.loadPlanner,
    saveEventsBySemester: mocks.savePlanner,
  }),
}));

vi.mock("@/features/weekly-schedule/lib/week-persistence", () => ({
  getDefaultWeekEvents: vi.fn(() => emptySemesters),
  resolveWeekEventStore: () => ({
    loadWeekEventsBySemester: mocks.loadWeek,
    saveWeekEventsBySemester: mocks.saveWeek,
  }),
}));

const AllProviders = ({ children }: { children: ReactNode }) => (
  <FriendsProvider>
    <PlannerStateProvider activeSemesterId={defaultPlannerSemesterId}>
      {children}
    </PlannerStateProvider>
  </FriendsProvider>
);

// Scope defaults to "default" when NEXT_PUBLIC_SAM_PLANNER_SCOPE is unset.
const EVENTS_KEY = "sam:offline:default:planner-events";
const WEEK_KEY = "sam:offline:default:week-events";

describe("offline fallback", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    mocks.loadFriends.mockResolvedValue([]);
  });

  it("stores a snapshot after a successful load", async () => {
    const liveEvents = { ...emptySemesters, "spring-2026": [cachedEvent] };
    mocks.loadPlanner.mockResolvedValue(liveEvents);
    mocks.loadWeek.mockResolvedValue(emptySemesters);

    const { result } = renderHook(() => usePlannerState(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.events).toHaveLength(1);
    });

    await waitFor(() => {
      expect(window.localStorage.getItem(EVENTS_KEY)).not.toBeNull();
    });

    const snapshot = JSON.parse(window.localStorage.getItem(EVENTS_KEY)!);
    expect(snapshot.payload["spring-2026"]).toHaveLength(1);
    expect(typeof snapshot.savedAt).toBe("string");
    expect(result.current.isOffline).toBe(false);
  });

  it("hydrates from the snapshot and never writes back when the network is gone", async () => {
    window.localStorage.setItem(
      EVENTS_KEY,
      JSON.stringify({
        version: 1, savedAt: "2026-08-01T10:00:00.000Z",
        payload: { ...emptySemesters, "spring-2026": [cachedEvent] },
      }),
    );
    window.localStorage.setItem(
      WEEK_KEY,
      JSON.stringify({ version: 1, savedAt: "2026-08-01T10:00:00.000Z", payload: emptySemesters }),
    );

    // fetch rejects with a TypeError when the host cannot be reached at all,
    // which is what separates "offline" from a rejected request.
    mocks.loadPlanner.mockRejectedValue(new TypeError("Failed to fetch"));
    mocks.loadWeek.mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => usePlannerState(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });

    // The cached calendar is on screen...
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].title).toBe("Cached exam");
    expect(result.current.lastSyncedAt).toBe("2026-08-01T10:00:00.000Z");

    // ...and nothing is written back. This is the guarantee that matters: the
    // save path prunes every row missing from state, so persisting a snapshot
    // would delete rows that still exist on the server.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mocks.savePlanner).not.toHaveBeenCalled();
    expect(mocks.saveWeek).not.toHaveBeenCalled();
  });

  it("still hydrates the planner when the friends load is the one that fails", async () => {
    // FriendsProvider wraps PlannerStateProvider, so a friends failure used to
    // throw before the planner could reach its own offline fallback — the whole
    // page went blank instead of showing cached data.
    window.localStorage.setItem(
      EVENTS_KEY,
      JSON.stringify({
        version: 1, savedAt: "2026-08-01T10:00:00.000Z",
        payload: { ...emptySemesters, "spring-2026": [cachedEvent] },
      }),
    );

    mocks.loadFriends.mockRejectedValue(new TypeError("Failed to fetch"));
    mocks.loadPlanner.mockRejectedValue(new TypeError("Failed to fetch"));
    mocks.loadWeek.mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => usePlannerState(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });

    expect(result.current.events).toHaveLength(1);

    // A failed friends load must never write the built-in defaults back over
    // the real list.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mocks.saveFriends).not.toHaveBeenCalled();
    expect(mocks.savePlanner).not.toHaveBeenCalled();
  });

  it("keeps an existing snapshot when the loader defers with null", async () => {
    // The adapters return null when there is no usable auth token yet, which is
    // "come back later", not "the database is empty". Persisting that would
    // replace a good snapshot with nothing.
    const goodSnapshot = JSON.stringify({
      version: 1, savedAt: "2026-08-01T10:00:00.000Z",
      payload: { ...emptySemesters, "spring-2026": [cachedEvent] },
    });
    window.localStorage.setItem(EVENTS_KEY, goodSnapshot);

    mocks.loadFriends.mockResolvedValue([]);
    mocks.loadPlanner.mockResolvedValue(null);
    mocks.loadWeek.mockResolvedValue(null);

    renderHook(() => usePlannerState(), { wrapper: AllProviders });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(window.localStorage.getItem(EVENTS_KEY)).toBe(goodSnapshot);

    // And nothing may be written to the server either: a deferred load must not
    // arm the save effects, whose prune step would delete every real row.
    expect(mocks.savePlanner).not.toHaveBeenCalled();
    expect(mocks.saveWeek).not.toHaveBeenCalled();
  });

  it("ignores a snapshot whose payload is null", async () => {
    window.localStorage.setItem(
      EVENTS_KEY,
      JSON.stringify({ version: 1, savedAt: "2026-08-01T10:00:00.000Z", payload: null }),
    );

    mocks.loadFriends.mockResolvedValue([]);
    mocks.loadPlanner.mockRejectedValue(new TypeError("Failed to fetch"));
    mocks.loadWeek.mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => usePlannerState(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });

    // No usable snapshot means no claimed sync time.
    expect(result.current.lastSyncedAt).toBeNull();
    expect(result.current.events).toHaveLength(0);
  });

  it("reports offline with no cached data rather than failing", async () => {
    mocks.loadPlanner.mockRejectedValue(new TypeError("Failed to fetch"));
    mocks.loadWeek.mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => usePlannerState(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });

    // An empty calendar still renders; months come from the semester config,
    // not from the database.
    expect(result.current.events).toHaveLength(0);
    expect(result.current.months.length).toBeGreaterThan(0);
    expect(result.current.lastSyncedAt).toBeNull();
    expect(mocks.savePlanner).not.toHaveBeenCalled();
  });
});
