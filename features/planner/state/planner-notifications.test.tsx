/**
 * @vitest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  FriendsProvider,
  useFriendsState,
} from "@/features/friends/state/friends-state";
import {
  PlannerStateProvider,
  usePlannerState,
} from "@/features/planner/state/planner-state";

// --- HOISTED MOCKS ---
const mocks = vi.hoisted(() => ({
  emptySemesters: {
    "spring-2026": [],
    "fall-2026": [],
  },
  loadFriends: vi.fn(async () => []),
  loadPlanner: vi.fn(async () => ({ "spring-2026": [], "fall-2026": [] })),
  loadWeek: vi.fn(async () => ({ "spring-2026": [], "fall-2026": [] })),
  broadcastNotifications: vi.fn(async () => {}),
}));

vi.mock("@/features/notifications/lib/notify-broadcast", () => ({
  broadcastNotifications: mocks.broadcastNotifications,
}));

vi.mock("@/features/friends/lib/friends-persistence", () => ({
  getDefaultFriends: vi.fn(() => []),
  resolveFriendsStore: () => ({
    loadFriends: mocks.loadFriends,
    saveFriends: vi.fn(async () => {}),
  }),
  loadFriends: mocks.loadFriends,
  saveFriends: vi.fn(async () => {}),
  insertFriend: vi.fn(async () => {}),
  updateFriendInStore: vi.fn(async () => {}),
  deleteFriendFromStore: vi.fn(async () => {}),
  rowToFriend: (row: { friend_name: string; birthday?: string | null }) => ({
    name: row.friend_name,
    birthday: row.birthday ?? undefined,
  }),
  friendToRow: (friend: { name: string; birthday?: string }) => ({
    planner_scope: "test",
    friend_name: friend.name,
    birthday: friend.birthday ?? null,
  }),
}));

vi.mock("@/features/planner/lib/planner-persistence", () => ({
  getDefaultEventsBySemester: vi.fn(() => mocks.emptySemesters),
  resolvePlannerEventStore: () => ({
    loadEvents: mocks.loadPlanner,
    loadEventsBySemester: mocks.loadPlanner,
    saveEventsBySemester: vi.fn(async () => {}),
    insertEvent: vi.fn(async () => {}),
    updateEvent: vi.fn(async () => {}),
    deleteEvent: vi.fn(async () => {}),
  }),
  loadEventsBySemester: mocks.loadPlanner,
  saveEventsBySemester: vi.fn(async () => {}),
  insertSupabaseEvent: vi.fn(async () => {}),
  updateSupabaseEvent: vi.fn(async () => {}),
  deleteSupabaseEvent: vi.fn(async () => {}),
}));

vi.mock("@/features/weekly-schedule/lib/week-persistence", () => ({
  getDefaultWeekEvents: vi.fn(() => mocks.emptySemesters),
  resolveWeekEventStore: () => ({
    loadWeekEventsBySemester: mocks.loadWeek,
    saveWeekEventsBySemester: vi.fn(async () => {}),
    insertWeekEvent: vi.fn(async () => {}),
    updateWeekEvent: vi.fn(async () => {}),
    deleteWeekEvent: vi.fn(async () => {}),
  }),
  loadWeekEventsBySemester: mocks.loadWeek,
  saveWeekEventsBySemester: vi.fn(async () => {}),
  insertSupabaseWeekEvent: vi.fn(async () => {}),
  updateSupabaseWeekEvent: vi.fn(async () => {}),
  deleteSupabaseWeekEvent: vi.fn(async () => {}),
}));

const AllProviders = ({ children }: { children: ReactNode }) => (
  <FriendsProvider>
    <PlannerStateProvider activeSemesterId="spring-2026">
      {children}
    </PlannerStateProvider>
  </FriendsProvider>
);

describe("Planner Push Notification Dispatching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not broadcast when creating an Exam or non-group event", async () => {
    const { result } = renderHook(
      () => ({
        planner: usePlannerState(),
      }),
      { wrapper: AllProviders },
    );

    await waitFor(() => expect(mocks.loadPlanner).toHaveBeenCalled());

    await act(async () => {
      result.current.planner.createEvent({
        title: "Final Exam",
        category: "Exam",
        startDate: "2026-05-10",
        endDate: "2026-05-10",
        participants: [],
      });
    });

    expect(mocks.broadcastNotifications).not.toHaveBeenCalled();
  });

  it("does not broadcast when adding a group event to the inbox (no date)", async () => {
    const { result } = renderHook(
      () => ({
        planner: usePlannerState(),
      }),
      { wrapper: AllProviders },
    );

    await waitFor(() => expect(mocks.loadPlanner).toHaveBeenCalled());

    await act(async () => {
      result.current.planner.createEvent({
        title: "Brainstorm Session",
        category: "Group Event",
        startDate: null,
        endDate: null,
        participants: [],
      });
    });

    expect(mocks.broadcastNotifications).not.toHaveBeenCalled();
  });

  it("broadcasts when creating a dated group event", async () => {
    const { result } = renderHook(
      () => ({
        planner: usePlannerState(),
      }),
      { wrapper: AllProviders },
    );

    await waitFor(() => expect(mocks.loadPlanner).toHaveBeenCalled());

    await act(async () => {
      result.current.planner.createEvent({
        title: "Group Study",
        category: "Group Event",
        startDate: "2026-05-12",
        endDate: "2026-05-12",
        startTime: "14:00",
        endTime: "16:00",
        participants: [],
      });
    });

    expect(mocks.broadcastNotifications).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          kind: "new-event",
          title: "Group Study",
          category: "Group Event",
          startDate: "2026-05-12",
          startTime: "14:00",
          endTime: "16:00",
        }),
      ],
      null,
    );
  });

  it("does not broadcast when creating a weekly appointment", async () => {
    const { result } = renderHook(
      () => ({
        planner: usePlannerState(),
      }),
      { wrapper: AllProviders },
    );

    await waitFor(() => expect(mocks.loadPlanner).toHaveBeenCalled());

    await act(async () => {
      result.current.planner.createWeekEvent({
        title: "Weekly Lecture",
        category: "University",
        day: "Mon",
        startTime: "10:00",
        endTime: "12:00",
        participants: [],
      });
    });

    expect(mocks.broadcastNotifications).not.toHaveBeenCalled();
  });

  it("broadcasts schedule-changed when moving a group event from inbox to calendar", async () => {
    const { result } = renderHook(
      () => ({
        planner: usePlannerState(),
      }),
      { wrapper: AllProviders },
    );

    await waitFor(() => expect(mocks.loadPlanner).toHaveBeenCalled());

    // 1. Create inbox group event (silent)
    await act(async () => {
      result.current.planner.createEvent({
        title: "Inbox Meetup",
        category: "Group Event",
        startDate: null,
        endDate: null,
        participants: [],
      });
    });
    expect(mocks.broadcastNotifications).not.toHaveBeenCalled();

    const created = result.current.planner.inboxEvents.find(
      (e) => e.title === "Inbox Meetup",
    );
    expect(created).toBeDefined();

    // 2. Move to calendar date
    await act(async () => {
      result.current.planner.moveEventToDate(created!.id, "2026-05-15");
    });

    expect(mocks.broadcastNotifications).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          kind: "schedule-changed",
          changeType: "scheduled",
          title: "Inbox Meetup",
          startDate: "2026-05-15",
        }),
      ],
      null,
    );
  });

  it("broadcasts schedule-changed when moving a dated group event to inbox", async () => {
    const { result } = renderHook(
      () => ({
        planner: usePlannerState(),
      }),
      { wrapper: AllProviders },
    );

    await waitFor(() => expect(mocks.loadPlanner).toHaveBeenCalled());

    // 1. Create dated group event
    await act(async () => {
      result.current.planner.createEvent({
        title: "Dated Meetup",
        category: "Group Event",
        startDate: "2026-05-15",
        endDate: "2026-05-15",
        participants: [],
      });
    });
    mocks.broadcastNotifications.mockClear();

    const created = result.current.planner.events.find(
      (e) => e.title === "Dated Meetup",
    );
    expect(created).toBeDefined();

    // 2. Move back to inbox
    await act(async () => {
      result.current.planner.moveEventToInbox(created!.id);
    });

    expect(mocks.broadcastNotifications).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          kind: "schedule-changed",
          changeType: "unscheduled",
          title: "Dated Meetup",
          startDate: null,
        }),
      ],
      null,
    );
  });

  it("does not broadcast when moving non-group events to date or inbox", async () => {
    const { result } = renderHook(
      () => ({
        planner: usePlannerState(),
      }),
      { wrapper: AllProviders },
    );

    await waitFor(() => expect(mocks.loadPlanner).toHaveBeenCalled());

    await act(async () => {
      result.current.planner.createEvent({
        title: "Personal Chore",
        category: "Private Event",
        startDate: null,
        endDate: null,
        participants: [],
      });
    });

    const chore = result.current.planner.inboxEvents.find(
      (e) => e.title === "Personal Chore",
    );
    expect(chore).toBeDefined();

    await act(async () => {
      result.current.planner.moveEventToDate(chore!.id, "2026-05-15");
    });
    expect(mocks.broadcastNotifications).not.toHaveBeenCalled();

    await act(async () => {
      result.current.planner.moveEventToInbox(chore!.id);
    });
    expect(mocks.broadcastNotifications).not.toHaveBeenCalled();
  });

  it("broadcasts joined and left when toggling participants on a group event", async () => {
    const { result } = renderHook(
      () => ({
        friends: useFriendsState(),
        planner: usePlannerState(),
      }),
      { wrapper: AllProviders },
    );

    await waitFor(() => expect(mocks.loadPlanner).toHaveBeenCalled());

    // Setup friend
    await act(async () => {
      result.current.friends.addFriend("Alice");
    });

    // Create group event
    await act(async () => {
      result.current.planner.createEvent({
        title: "Dinner Party",
        category: "Group Event",
        startDate: "2026-05-20",
        endDate: "2026-05-20",
        participants: [],
      });
    });
    mocks.broadcastNotifications.mockClear();

    const event = result.current.planner.events.find(
      (e) => e.title === "Dinner Party",
    );
    expect(event).toBeDefined();

    // Toggle friend in (joined)
    await act(async () => {
      result.current.planner.toggleParticipant(event!.id, "Alice");
    });

    expect(mocks.broadcastNotifications).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          kind: "new-participant",
          action: "joined",
          participants: ["Alice"],
        }),
      ],
      null,
    );
    mocks.broadcastNotifications.mockClear();

    // Toggle friend out (left)
    await act(async () => {
      result.current.planner.toggleParticipant(event!.id, "Alice");
    });

    expect(mocks.broadcastNotifications).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          kind: "new-participant",
          action: "left",
          participants: ["Alice"],
        }),
      ],
      null,
    );
  });
});
