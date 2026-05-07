/**
 * @vitest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";

import {
  FriendsProvider,
  useFriendsState,
} from "@/features/friends/state/friends-state";
import {
  PlannerStateProvider,
  usePlannerState,
} from "@/features/planner/state/planner-state";
import {
  defaultPlannerSemesterId,
  type PlannerEvent,
} from "@/features/planner/lib/planner";

// --- HOISTED MOCKS ---
const mocks = vi.hoisted(() => ({
  // We return a proper empty state object instead of just {} to prevent reducer errors
  emptySemesters: {
    "spring-2026": [],
    "fall-2026": [],
  },
  loadFriends: vi.fn(async () => []),
  loadPlanner: vi.fn(async () => ({ "spring-2026": [], "fall-2026": [] })),
  loadWeek: vi.fn(async () => ({ "spring-2026": [], "fall-2026": [] })),
}));

vi.mock("@/features/friends/lib/friends-persistence", () => ({
  getDefaultFriends: vi.fn(() => []),
  resolveFriendsStore: () => ({
    loadFriends: mocks.loadFriends,
    saveFriends: vi.fn(async () => {}),
  }),
  loadFriends: mocks.loadFriends,
  saveFriends: vi.fn(async () => {}),
}));

vi.mock("@/features/planner/lib/planner-persistence", () => ({
  getDefaultEventsBySemester: vi.fn(() => mocks.emptySemesters),
  resolvePlannerEventStore: () => ({
    loadEventsBySemester: mocks.loadPlanner,
    saveEventsBySemester: vi.fn(async () => {}),
  }),
  loadEventsBySemester: mocks.loadPlanner,
  saveEventsBySemester: vi.fn(async () => {}),
}));

vi.mock("@/features/weekly-schedule/lib/week-persistence", () => ({
  getDefaultWeekEvents: vi.fn(() => mocks.emptySemesters),
  resolveWeekEventStore: () => ({
    loadWeekEventsBySemester: mocks.loadWeek,
    saveWeekEventsBySemester: vi.fn(async () => {}),
  }),
  loadWeekEventsBySemester: mocks.loadWeek,
  saveWeekEventsBySemester: vi.fn(async () => {}),
}));

const AllProviders = ({ children }: { children: ReactNode }) => (
  <FriendsProvider>
    <PlannerStateProvider activeSemesterId={defaultPlannerSemesterId}>
      {children}
    </PlannerStateProvider>
  </FriendsProvider>
);

describe("Domain Cascade Integration", () => {
  it("automatically renames participants in planner events when a friend is renamed", async () => {
    const { result } = renderHook(
      () => ({
        friends: useFriendsState(),
        planner: usePlannerState(),
      }),
      { wrapper: AllProviders },
    );

    // 1. SETTLE: Wait for the providers to finish initial hydration from the mocks
    await waitFor(() => expect(mocks.loadPlanner).toHaveBeenCalled());

    // 2. SETUP: Add the friend first and wait for them to appear
    await act(async () => {
      result.current.friends.addFriend("Old Name");
    });
    await waitFor(() =>
      expect(result.current.friends.friends).toContain("Old Name"),
    );

    // 3. SETUP: Create the event and wait for it to be stored in state
    await act(async () => {
      result.current.planner.createEvent({
        title: "Integration Test Event",
        category: "Group Event",
        startDate: "2026-05-07",
        endDate: "2026-05-07",
        participants: ["Old Name"],
      });
    });
    await waitFor(() => {
      const ev = result.current.planner.events.find(
        (e) => e.title === "Integration Test Event",
      );
      expect(ev).toBeDefined();
      expect(ev?.participants).toContain("Old Name");
    });

    // 4. ACTION: Perform the rename
    await act(async () => {
      result.current.friends.renameFriend("Old Name", "New Name");
    });

    // 5. VERIFY: Wait for the cascade effect to propagate to the Planner domain
    await waitFor(
      () => {
        const event = result.current.planner.events.find(
          (e: PlannerEvent) => e.title === "Integration Test Event",
        );
        expect(event?.participants).toContain("New Name");
        expect(event?.participants).not.toContain("Old Name");
      },
      { timeout: 2000 },
    );
  });

  it("removes a participant from all events when the friend is deleted", async () => {
    const { result } = renderHook(
      () => ({
        friends: useFriendsState(),
        planner: usePlannerState(),
      }),
      { wrapper: AllProviders },
    );

    await waitFor(() => expect(mocks.loadPlanner).toHaveBeenCalled());

    // Setup Friends
    await act(async () => {
      result.current.friends.addFriend("Ghost Friend");
      result.current.friends.addFriend("Keep Me");
    });
    await waitFor(() =>
      expect(result.current.friends.friends).toContain("Ghost Friend"),
    );

    // Setup Event
    await act(async () => {
      result.current.planner.createEvent({
        title: "Cleanup Test Event",
        category: "Other",
        startDate: "2026-05-08",
        endDate: "2026-05-08",
        participants: ["Ghost Friend", "Keep Me"],
      });
    });
    await waitFor(() => {
      expect(
        result.current.planner.events.some(
          (e) => e.title === "Cleanup Test Event",
        ),
      ).toBe(true);
    });

    // Action: Delete Friend
    await act(async () => {
      result.current.friends.removeFriend("Ghost Friend");
    });

    // Verify Cleanup
    await waitFor(
      () => {
        const event = result.current.planner.events.find(
          (e: PlannerEvent) => e.title === "Cleanup Test Event",
        );
        expect(event).toBeDefined();
        expect(event?.participants).not.toContain("Ghost Friend");
        expect(event?.participants).toContain("Keep Me");
      },
      { timeout: 2000 },
    );
  });
});
