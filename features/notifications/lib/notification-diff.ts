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

import { defaultPlannerSemesterId } from "@/features/planner/lib/planner";

/**
 * The minimal event shape the diff needs. Both calendar and weekly events are
 * flattened into this shape before diffing so a single implementation covers
 * "a new participant somewhere".
 */
export type DiffableEvent = {
  id: string;
  title: string;
  participants: string[];
  /** ISO date of a calendar event. Absent on weekly events, which recur. */
  startDate?: string | null;
  /** Weekday of a weekly event. Absent on calendar events. */
  day?: string;
  /** Semester the event lives in, used to build the notification's click target. */
  semesterId?: string;
};

/** Fields every notification carries, regardless of what triggered it. */
type NotificationContext = {
  eventId: string;
  title: string;
  startDate?: string | null;
  day?: string;
  semesterId?: string;
};

/**
 * A single notification to broadcast. `new-event` fires once per created event;
 * `new-participant` fires once per participant added to a pre-existing event.
 */
export type NotificationItem =
  | ({ kind: "new-event" } & NotificationContext)
  | ({ kind: "new-participant"; participant: string } & NotificationContext);

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
      startDate: event.startDate,
      day: event.day,
      semesterId: event.semesterId,
    };

    if (!before) {
      notifications.push({ kind: "new-event", ...context });
      continue;
    }

    const knownParticipants = toLowerSet(before.participants);

    for (const participant of event.participants) {
      const normalized = participant.trim();

      if (!normalized) {
        continue;
      }

      if (!knownParticipants.has(normalized.toLocaleLowerCase())) {
        notifications.push({
          kind: "new-participant",
          participant: normalized,
          ...context,
        });
      }
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
  if (item.day) {
    return item.day;
  }

  if (!item.startDate) {
    return null;
  }

  try {
    return format(parseISO(item.startDate), "d MMM", { locale: enGB });
  } catch {
    return null;
  }
}

/**
 * The click target. There is no per-event deep link in the app, so this gets the
 * reader as close as the routes allow: the right view, and the semester the
 * event belongs to. The default semester needs no query string.
 */
function buildUrl(item: NotificationContext) {
  const path = item.day ? "/week" : "/";

  if (!item.semesterId || item.semesterId === defaultPlannerSemesterId) {
    return path;
  }

  return `${path}?semester=${encodeURIComponent(item.semesterId)}`;
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
      title: "New event",
      body: when ? `${item.title} · ${when}` : item.title,
      tag: `event:${item.eventId}`,
      url: target,
    };
  }

  return {
    title: "New participant",
    body: `${item.participant} → ${item.title}`,
    tag: `participant:${item.eventId}:${item.participant.toLocaleLowerCase()}`,
    url: target,
  };
}
