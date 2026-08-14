// Standard Web Push service worker. No Firebase project dependency —
// works with any browser that supports the Push API. Also required for
// PWA installability (a registered service worker is one of the criteria).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A minimal fetch handler (even a no-op) satisfies installability checks
// on browsers that still require one. We don't cache anything here — every
// request just goes to the network as normal, so the site's data always
// stays fresh.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let payload = { title: "Skarlee", body: "New notification", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Ignore malformed payloads.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || "/favicon.ico",
      image: payload.image || undefined,
      badge: "/favicon.ico",
      tag: "skarlee-notification",
      requireInteraction: true,
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
