/**
 * Notification Diffing
 *
 * Pure functions that compare a previous and next planner snapshot and derive
 * the user-facing push notifications that should fire. Two triggers are
 * supported: a brand-new event appearing, and a new participant being added to
 * an event that already existed. Keeping this logic pure makes it trivially
 * unit-testable and independent of React, Supabase, and the service worker.
 */

import { format, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";

import {
  defaultPlannerSemesterId,
  getSemesterIdForDate,
} from "@/features/planner/lib/planner";

/**
 * The minimal event shape the diff needs. Both calendar and weekly events are
 * flattened into this shape before diffing so a single implementation covers
 * "a new participant somewhere".
 */
export type DiffableEvent = {
  id: string;
  title: string;
  category?: string;
  participants: string[];
  /** ISO date of a calendar event. Absent on weekly events, which recur. */
  startDate?: string | null;
  /** Weekday of a weekly event. Absent on calendar events. */
  day?: string;
  /** Semester the event lives in, used to build the notification's click target. */
  semesterId?: string;
};

/** Fields every notification carries, regardless of what triggered it. */
export type NotificationContext = {
  eventId: string;
  title: string;
  category?: string;
  startDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  day?: string;
  semesterId?: string;
};

/**
 * A single notification to broadcast.
 * - `new-event`: fires when a new group event is created.
 * - `new-participant`: fires when participants join or leave a group event.
 * - `schedule-changed`: fires when date or time changes, or moved to/from inbox.
 */
export type NotificationItem =
  | ({ kind: "new-event" } & NotificationContext)
  | ({
      kind: "new-participant";
      participants: string[];
      action?: "joined" | "left";
    } & NotificationContext)
  | ({
      kind: "schedule-changed";
      changeType: "scheduled" | "rescheduled" | "unscheduled";
    } & NotificationContext);

function toEventMap(events: DiffableEvent[]): Map<string, DiffableEvent> {
  const map = new Map<string, DiffableEvent>();

  for (const event of events) {
    map.set(event.id, event);
  }

  return map;
}

function toLowerSet(participants: string[]): Set<string> {
  return new Set(participants.map((name) => name.trim().toLocaleLowerCase()));
}

/**
 * Compares two flattened event lists and returns the notifications implied by
 * the change. A new event never also emits per-participant notifications: its
 * single `new-event` item already announces it, participants included.
 */
export function diffForNotifications(
  previous: DiffableEvent[],
  next: DiffableEvent[],
): NotificationItem[] {
  const previousById = toEventMap(previous);
  const notifications: NotificationItem[] = [];

  for (const event of next) {
    const before = previousById.get(event.id);
    const context: NotificationContext = {
      eventId: event.id,
      title: event.title,
      category: event.category,
      startDate: event.startDate,
      day: event.day,
      semesterId: event.semesterId,
    };

    if (!before) {
      notifications.push({ kind: "new-event", ...context });
      continue;
    }

    const knownParticipants = toLowerSet(before.participants);
    const addedParticipants: string[] = [];

    for (const participant of event.participants) {
      const normalized = participant.trim();

      if (!normalized) {
        continue;
      }

      if (!knownParticipants.has(normalized.toLocaleLowerCase())) {
        addedParticipants.push(normalized);
      }
    }

    if (addedParticipants.length > 0) {
      notifications.push({
        kind: "new-participant",
        participants: addedParticipants,
        ...context,
      });
    }
  }

  return notifications;
}

/**
 * A short "when" label for the notification body: the weekday for a recurring
 * weekly event, otherwise the calendar date. Null when the event is undated,
 * which is the case for anything still sitting in the inbox.
 */
function formatWhen(item: NotificationContext) {
  const timeStr = item.startTime
    ? item.endTime
      ? `; ${item.startTime} – ${item.endTime}`
      : `; ${item.startTime}`
    : "";

  if (item.day) {
    return `${item.day}${timeStr}`;
  }

  if (!item.startDate) {
    return null;
  }

  try {
    const dateStr = format(parseISO(item.startDate), "d MMM", { locale: enGB });
    return `${dateStr}${timeStr}`;
  } catch {
    return null;
  }
}

/**
 * Generates the notification title for a new event, tailored to its category
 * (e.g. "New exam", "New group event") or falling back to "New event".
 */
function formatNewEventTitle(category?: string) {
  if (!category || category.trim().toLowerCase() === "other") {
    return "New event";
  }

  return `New ${category.trim().toLowerCase()}`;
}

/**
 * Formats a list of added participants for notification copy, using natural
 * conjunctions and truncating long lists (e.g. "Alice, Bob + 2 others").
 */
function formatParticipants(participants: string[]) {
  if (participants.length === 0) {
    return "";
  }

  if (participants.length === 1) {
    return participants[0];
  }

  if (participants.length === 2) {
    return `${participants[0]} and ${participants[1]}`;
  }

  const remaining = participants.length - 2;
  const others = remaining === 1 ? "1 other" : `${remaining} others`;

  return `${participants[0]}, ${participants[1]} and ${others}`;
}

/**
 * The click target. Directs the user to the exact view and semester the
 * event lives in, always specifying semester explicitly.
 */
function buildUrl(item: NotificationContext) {
  const path = item.day ? "/week" : "/";
  const params = new URLSearchParams();

  const semesterId =
    item.semesterId ??
    (item.startDate ? getSemesterIdForDate(item.startDate) : defaultPlannerSemesterId);

  params.set("semester", semesterId);

  if (item.eventId) {
    params.set("event", item.eventId);
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Renders a notification item into the { title, body, tag, url } payload the
 * service worker displays. Copy is English, matching the rest of the app UI.
 * Pass `url` to override the derived click target.
 */
export function toPushPayload(item: NotificationItem, url?: string) {
  const target = url ?? buildUrl(item);

  if (item.kind === "new-event") {
    const when = formatWhen(item);

    return {
      title: formatNewEventTitle(item.category),
      body: when ? `${item.title} · ${when}` : item.title,
      tag: `event:${item.eventId}`,
      url: target,
    };
  }

  if (item.kind === "schedule-changed") {
    const when = formatWhen(item);

    if (item.changeType === "unscheduled") {
      return {
        title: "Group event unscheduled",
        body: `${item.title} moved to inbox`,
        tag: `event:${item.eventId}`,
        url: target,
      };
    }

    if (item.changeType === "scheduled") {
      return {
        title: "Group event scheduled",
        body: when ? `${item.title} scheduled for ${when}` : item.title,
        tag: `event:${item.eventId}`,
        url: target,
      };
    }

    return {
      title: "Group event rescheduled",
      body: when ? `${item.title} moved to ${when}` : item.title,
      tag: `event:${item.eventId}`,
      url: target,
    };
  }

  const isMultiple = item.participants.length > 1;
  const participantNames = formatParticipants(item.participants);
  const isLeft = item.action === "left";

  return {
    title: isLeft
      ? (isMultiple ? "Participants left" : "Participant left")
      : (isMultiple ? "New participants" : "New participant"),
    body: `${participantNames} ${isLeft ? "left" : "joined"} ${item.title}`,
    tag: `participant:${item.eventId}`,
    url: target,
  };
}
