/**
 * SAM service worker.
 *
 * Provides the minimum needed for installability plus a lightweight offline
 * experience. It intentionally does NOT precache Next.js's hashed build assets
 * (those change every build); instead it caches them at runtime as they are
 * requested, and serves a cached app shell for navigations when offline.
 */

const CACHE_VERSION = "sam-cache-v2";
const APP_SHELL = ["/", "/icons/icon.svg", "/icons/maskable.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      // Best-effort: a single failed fetch must not abort installation.
      .then((cache) => Promise.allSettled(APP_SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Push: the OS wakes this handler even when the app is fully closed. The
// payload is JSON produced by the /api/notify route ({ title, body, url }).
self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // A malformed or empty payload should still surface a generic notification
    // rather than silently dropping the wake-up.
    payload = {};
  }

  const title = payload.title || "SAM";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    // Collapse repeated notifications about the same event into one entry.
    tag: payload.tag,
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click: focus an existing SAM tab if one is open, otherwise open
// a new window at the notification's target url.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              client.navigate(targetUrl);
            }
            return undefined;
          }
        }

        return self.clients.openWindow(targetUrl);
      }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET requests; let everything else hit the network.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Navigations: network-first so users get fresh data, falling back to the
  // cached app shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached || caches.match("/")),
      ),
    );
    return;
  }

  // Static assets: stale-while-revalidate for instant loads with a fresh
  // background update.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    }),
  );
});
