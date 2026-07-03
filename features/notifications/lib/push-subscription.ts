/**
 * Web Push Subscription (client)
 *
 * Owns the browser side of push: feature detection, permission, subscribing via
 * the service worker's PushManager, and persisting the resulting subscription
 * into Supabase so the server-side notify route can reach this device later.
 *
 * The Supabase access mirrors the planner persistence adapter: same env vars,
 * same scope partitioning, and the same localStorage auth token.
 */

const SUPABASE_SUBSCRIPTIONS_TABLE = "push_subscriptions";
const DEFAULT_PLANNER_SCOPE = "default";

function normalizePlannerScope(rawScope: string | undefined) {
  const normalized = (rawScope ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || DEFAULT_PLANNER_SCOPE;
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return {
    url,
    anonKey,
    plannerScope: normalizePlannerScope(process.env.NEXT_PUBLIC_SAM_PLANNER_SCOPE),
  };
}

function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("sam_auth_token");
}

/**
 * Whether this browser can register push subscriptions at all. Notably false in
 * a plain iOS Safari tab — there push only works once the PWA is installed to
 * the home screen.
 */
export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(getVapidPublicKey())
  );
}

/**
 * The current browser permission state, or "unsupported" when push cannot run.
 */
export function getPermissionState(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) {
    return "unsupported";
  }

  return Notification.permission;
}

// The applicationServerKey must be a Uint8Array, so the base64url VAPID public
// key has to be decoded into raw bytes first.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function persistSubscription(subscription: PushSubscription) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase configuration missing; cannot store push subscription.");
  }

  const token = getAuthToken();

  if (!token) {
    throw new Error("Not authenticated; cannot store push subscription.");
  }

  const json = subscription.toJSON();
  const keys = json.keys ?? {};

  const response = await fetch(
    `${config.url}/rest/v1/${SUPABASE_SUBSCRIPTIONS_TABLE}?on_conflict=endpoint`,
    {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        planner_scope: config.plannerScope,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "no details");
    throw new Error(`Failed to store push subscription: ${response.status} ${details}`);
  }
}

async function deleteSubscription(endpoint: string) {
  const config = getSupabaseConfig();
  const token = getAuthToken();

  if (!config || !token) {
    return;
  }

  await fetch(
    `${config.url}/rest/v1/${SUPABASE_SUBSCRIPTIONS_TABLE}?endpoint=eq.${encodeURIComponent(endpoint)}`,
    {
      method: "DELETE",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${token}`,
      },
    },
  ).catch(() => {
    // Best-effort cleanup: a failed delete only leaves a stale row, which the
    // notify route prunes on the next 410 Gone from the push service.
  });
}

/**
 * Requests permission if needed, subscribes through the ready service worker,
 * and persists the subscription. Returns the subscription endpoint, which the
 * caller stores so it can exclude this device from its own broadcasts.
 */
export async function enablePushNotifications(): Promise<string> {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey()),
    }));

  await persistSubscription(subscription);

  return subscription.endpoint;
}

/**
 * Unsubscribes this device and removes its row from Supabase. Safe to call when
 * nothing is subscribed.
 */
export async function disablePushNotifications(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  await deleteSubscription(subscription.endpoint);
  await subscription.unsubscribe();
}

/**
 * Returns the endpoint of the currently active subscription, or null. Used to
 * restore the toggle state on load and to exclude this device from broadcasts.
 */
export async function getActiveSubscriptionEndpoint(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  return subscription?.endpoint ?? null;
}
