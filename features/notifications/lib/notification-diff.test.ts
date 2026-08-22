import { describe, expect, it } from "vitest";

import {
  diffForNotifications,
  toPushPayload,
  type DiffableEvent,
} from "@/features/notifications/lib/notification-diff";
import {
  defaultPlannerSemesterId,
  plannerSemesterIds,
} from "@/features/planner/lib/planner";

function event(
  id: string,
  title: string,
  participants: string[] = [],
): DiffableEvent {
  return { id, title, participants };
}

describe("diffForNotifications", () => {
  it("returns nothing when snapshots are identical", () => {
    const snapshot = [event("a", "Exam", ["Paul"])];

    expect(diffForNotifications(snapshot, snapshot)).toEqual([]);
  });

  it("flags a brand-new event once, without per-participant items", () => {
    const previous: DiffableEvent[] = [];
    const next = [event("a", "Exam", ["Paul", "Mia"])];

    expect(diffForNotifications(previous, next)).toEqual([
      { kind: "new-event", eventId: "a", title: "Exam" },
    ]);
  });

  it("flags a participant added to an existing event", () => {
    const previous = [event("a", "Exam", ["Paul"])];
    const next = [event("a", "Exam", ["Paul", "Mia"])];

    expect(diffForNotifications(previous, next)).toEqual([
      { kind: "new-participant", eventId: "a", title: "Exam", participant: "Mia" },
    ]);
  });

  it("ignores participant removals and reorderings", () => {
    const previous = [event("a", "Exam", ["Paul", "Mia"])];
    const next = [event("a", "Exam", ["Mia"])];

    expect(diffForNotifications(previous, next)).toEqual([]);
  });

  it("treats participant names case-insensitively", () => {
    const previous = [event("a", "Exam", ["Paul"])];
    const next = [event("a", "Exam", ["paul", "PAUL"])];

    expect(diffForNotifications(previous, next)).toEqual([]);
  });

  it("detects both a new event and a new participant in one diff", () => {
    const previous = [event("a", "Exam", ["Paul"])];
    const next = [event("a", "Exam", ["Paul", "Mia"]), event("b", "Party", [])];

    expect(diffForNotifications(previous, next)).toEqual([
      { kind: "new-participant", eventId: "a", title: "Exam", participant: "Mia" },
      { kind: "new-event", eventId: "b", title: "Party" },
    ]);
  });
});

describe("toPushPayload", () => {
  it("renders a new-event payload with a stable per-event tag", () => {
    expect(
      toPushPayload({ kind: "new-event", eventId: "a", title: "Exam" }),
    ).toEqual({ title: "New event", body: "Exam", tag: "event:a", url: "/" });
  });

  it("renders a new-participant payload keyed by event and participant", () => {
    expect(
      toPushPayload({
        kind: "new-participant",
        eventId: "a",
        title: "Exam",
        participant: "Mia",
      }),
    ).toEqual({
      title: "New participant",
      body: "Mia → Exam",
      tag: "participant:a:mia",
      url: "/",
    });
  });

  it("appends the date of a calendar event to the body", () => {
    expect(
      toPushPayload({
        kind: "new-event",
        eventId: "a",
        title: "Exam",
        startDate: "2026-03-02",
      }).body,
    ).toBe("Exam · 2 Mar");
  });

  it("uses the weekday for a recurring weekly event", () => {
    expect(
      toPushPayload({ kind: "new-event", eventId: "a", title: "Lab", day: "Mon" })
        .body,
    ).toBe("Lab · Mon");
  });

  it("leaves the body bare for an undated inbox event", () => {
    expect(
      toPushPayload({ kind: "new-event", eventId: "a", title: "Idea", startDate: null })
        .body,
    ).toBe("Idea");
  });

  it("points a weekly event at the week view", () => {
    expect(
      toPushPayload({ kind: "new-event", eventId: "a", title: "Lab", day: "Mon" }).url,
    ).toBe("/week");
  });

  it("adds a semester query only when it is not the default one", () => {
    const other = plannerSemesterIds.find((id) => id !== defaultPlannerSemesterId);

    expect(
      toPushPayload({
        kind: "new-event",
        eventId: "a",
        title: "Exam",
        semesterId: defaultPlannerSemesterId,
      }).url,
    ).toBe("/");

    expect(
      toPushPayload({
        kind: "new-event",
        eventId: "a",
        title: "Exam",
        semesterId: other,
      }).url,
    ).toBe(`/?semester=${other}`);
  });

  it("lets an explicit url override the derived target", () => {
    expect(
      toPushPayload(
        { kind: "new-event", eventId: "a", title: "Exam", day: "Mon" },
        "/list",
      ).url,
    ).toBe("/list");
  });
});
