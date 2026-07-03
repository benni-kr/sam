/**
 * Notification Diffing
 *
 * Pure functions that compare a previous and next planner snapshot and derive
 * the user-facing push notifications that should fire. Two triggers are
 * supported: a brand-new event appearing, and a new participant being added to
 * an event that already existed. Keeping this logic pure makes it trivially
 * unit-testable and independent of React, Supabase, and the service worker.
 */

/**
 * The minimal event shape the diff needs. Both calendar and weekly events are
 * flattened into this shape before diffing so a single implementation covers
 * "a new participant somewhere".
 */
export type DiffableEvent = {
  id: string;
  title: string;
  participants: string[];
};

/**
 * A single notification to broadcast. `new-event` fires once per created event;
 * `new-participant` fires once per participant added to a pre-existing event.
 */
export type NotificationItem =
  | { kind: "new-event"; eventId: string; title: string }
  | {
      kind: "new-participant";
      eventId: string;
      title: string;
      participant: string;
    };

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

    if (!before) {
      notifications.push({
        kind: "new-event",
        eventId: event.id,
        title: event.title,
      });
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
          eventId: event.id,
          title: event.title,
          participant: normalized,
        });
      }
    }
  }

  return notifications;
}

/**
 * Renders a notification item into the { title, body, tag, url } payload the
 * service worker displays. Copy is intentionally German to match the app UI.
 */
export function toPushPayload(item: NotificationItem, url = "/") {
  if (item.kind === "new-event") {
    return {
      title: "Neuer Termin",
      body: item.title,
      tag: `event:${item.eventId}`,
      url,
    };
  }

  return {
    title: "Neue:r Teilnehmer:in",
    body: `${item.participant} → ${item.title}`,
    tag: `participant:${item.eventId}:${item.participant.toLocaleLowerCase()}`,
    url,
  };
}
