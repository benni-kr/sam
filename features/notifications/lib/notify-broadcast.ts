/**
 * Notification Broadcast (client)
 *
 * Fire-and-forget bridge from a detected planner change to the server-side
 * sender. The acting client posts the notifications it derived to /api/notify,
 * which fans them out to every other subscribed device in the same scope.
 */

import {
  toPushPayload,
  type NotificationItem,
} from "@/features/notifications/lib/notification-diff";

function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("sam_auth_token");
}

/**
 * Sends the given notifications to the broadcast route. `excludeEndpoint` is
 * this device's own subscription, so the actor never gets pinged for their own
 * action. Never throws: a failed broadcast must not disrupt saving the planner.
 */
export async function broadcastNotifications(
  items: NotificationItem[],
  excludeEndpoint: string | null,
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const token = getAuthToken();

  if (!token) {
    return;
  }

  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        excludeEndpoint,
        notifications: items.map((item) => toPushPayload(item)),
      }),
    });
  } catch {
    // Best-effort: notifications are a side channel, so a transport error here
    // is swallowed rather than surfaced as a planner persistence failure.
  }
}
