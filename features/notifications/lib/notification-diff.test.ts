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
      { kind: "new-participant", eventId: "a", title: "Exam", participants: ["Mia"] },
    ]);
  });

  it("groups multiple participants added to the same event into a single item", () => {
    const previous = [event("a", "Exam", ["Paul"])];
    const next = [event("a", "Exam", ["Paul", "Mia", "Leo", "Sam"])];

    expect(diffForNotifications(previous, next)).toEqual([
      {
        kind: "new-participant",
        eventId: "a",
        title: "Exam",
        participants: ["Mia", "Leo", "Sam"],
      },
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
      { kind: "new-participant", eventId: "a", title: "Exam", participants: ["Mia"] },
      { kind: "new-event", eventId: "b", title: "Party" },
    ]);
  });
});

describe("toPushPayload", () => {
  it("renders a new-event payload with a stable per-event tag", () => {
    expect(
      toPushPayload({ kind: "new-event", eventId: "a", title: "Exam" }),
    ).toEqual({
      title: "New event",
      body: "Exam",
      tag: "event:a",
      url: `/?semester=${defaultPlannerSemesterId}&event=a`,
    });
  });

  it("formats the title according to category", () => {
    expect(
      toPushPayload({
        kind: "new-event",
        eventId: "a",
        title: "Calculus",
        category: "Exam",
      }).title,
    ).toBe("New exam");

    expect(
      toPushPayload({
        kind: "new-event",
        eventId: "b",
        title: "Study session",
        category: "Group Event",
      }).title,
    ).toBe("New group event");

    expect(
      toPushPayload({
        kind: "new-event",
        eventId: "c",
        title: "Gym",
        category: "Sports",
      }).title,
    ).toBe("New sports");

    expect(
      toPushPayload({
        kind: "new-event",
        eventId: "d",
        title: "Random",
        category: "Other",
      }).title,
    ).toBe("New event");
  });

  it("renders a single participant payload", () => {
    expect(
      toPushPayload({
        kind: "new-participant",
        eventId: "a",
        title: "Exam",
        participants: ["Mia"],
      }),
    ).toEqual({
      title: "New participant",
      body: "Mia joined Exam",
      tag: "participant:a",
      url: `/?semester=${defaultPlannerSemesterId}&event=a`,
    });
  });

  it("renders two participants with natural 'and' phrasing", () => {
    expect(
      toPushPayload({
        kind: "new-participant",
        eventId: "a",
        title: "Exam",
        participants: ["Mia", "Leo"],
      }),
    ).toEqual({
      title: "New participants",
      body: "Mia and Leo joined Exam",
      tag: "participant:a",
      url: `/?semester=${defaultPlannerSemesterId}&event=a`,
    });
  });

  it("renders 3+ participants with overflow truncation", () => {
    expect(
      toPushPayload({
        kind: "new-participant",
        eventId: "a",
        title: "Exam",
        participants: ["Mia", "Leo", "Sam"],
      }),
    ).toEqual({
      title: "New participants",
      body: "Mia, Leo and 1 other joined Exam",
      tag: "participant:a",
      url: `/?semester=${defaultPlannerSemesterId}&event=a`,
    });

    expect(
      toPushPayload({
        kind: "new-participant",
        eventId: "a",
        title: "Exam",
        participants: ["Mia", "Leo", "Sam", "Paul", "Anna"],
      }),
    ).toEqual({
      title: "New participants",
      body: "Mia, Leo and 3 others joined Exam",
      tag: "participant:a",
      url: `/?semester=${defaultPlannerSemesterId}&event=a`,
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

  it("points a weekly event at the week view with semester", () => {
    expect(
      toPushPayload({ kind: "new-event", eventId: "a", title: "Lab", day: "Mon" }).url,
    ).toBe(`/week?semester=${defaultPlannerSemesterId}&event=a`);
  });

  it("always includes the semester query in the url", () => {
    const other = plannerSemesterIds.find((id) => id !== defaultPlannerSemesterId);

    expect(
      toPushPayload({
        kind: "new-event",
        eventId: "a",
        title: "Exam",
        semesterId: defaultPlannerSemesterId,
      }).url,
    ).toBe(`/?semester=${defaultPlannerSemesterId}&event=a`);

    expect(
      toPushPayload({
        kind: "new-event",
        eventId: "a",
        title: "Exam",
        semesterId: other,
      }).url,
    ).toBe(`/?semester=${other}&event=a`);
  });

  it("lets an explicit url override the derived target", () => {
    expect(
      toPushPayload(
        { kind: "new-event", eventId: "a", title: "Exam", day: "Mon" },
        "/list",
      ).url,
    ).toBe("/list");
  });

  it("renders schedule-changed payloads for scheduled, rescheduled, and unscheduled", () => {
    expect(
      toPushPayload({
        kind: "schedule-changed",
        eventId: "a",
        title: "Study session",
        startDate: "2026-05-15",
        startTime: "14:00",
        endTime: "16:30",
        changeType: "scheduled",
      }),
    ).toEqual({
      title: "Group event scheduled",
      body: "Study session scheduled for 15 May; 14:00 – 16:30",
      tag: "event:a",
      url: `/?semester=spring-2026&event=a`,
    });

    expect(
      toPushPayload({
        kind: "schedule-changed",
        eventId: "a",
        title: "Study session",
        startDate: "2026-05-16",
        startTime: "10:00",
        changeType: "rescheduled",
      }),
    ).toEqual({
      title: "Group event rescheduled",
      body: "Study session moved to 16 May; 10:00",
      tag: "event:a",
      url: `/?semester=spring-2026&event=a`,
    });

    expect(
      toPushPayload({
        kind: "schedule-changed",
        eventId: "a",
        title: "Study session",
        startDate: null,
        changeType: "unscheduled",
      }),
    ).toEqual({
      title: "Group event unscheduled",
      body: "Study session moved to inbox",
      tag: "event:a",
      url: `/?semester=${defaultPlannerSemesterId}&event=a`,
    });
  });

  it("renders participant left payloads correctly", () => {
    expect(
      toPushPayload({
        kind: "new-participant",
        eventId: "a",
        title: "Study session",
        participants: ["Mia"],
        action: "left",
      }),
    ).toEqual({
      title: "Participant left",
      body: "Mia left Study session",
      tag: "participant:a",
      url: `/?semester=${defaultPlannerSemesterId}&event=a`,
    });

    expect(
      toPushPayload({
        kind: "new-participant",
        eventId: "a",
        title: "Study session",
        participants: ["Mia", "Leo"],
        action: "left",
      }),
    ).toEqual({
      title: "Participants left",
      body: "Mia and Leo left Study session",
      tag: "participant:a",
      url: `/?semester=${defaultPlannerSemesterId}&event=a`,
    });
  });
});
