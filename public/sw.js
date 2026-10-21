/*
 * Kang Cabe service worker — notifications only.
 *
 * No offline caching on purpose: the garden always has signal (the owner's
 * call), and a cache is one more place for an old page to come back from.
 * This file shows what the server pushes and opens the page it points at.
 */

self.addEventListener("install", () => {
  // Take over straight away, so an update to this file is live on the next
  // notification rather than after every tab has been closed.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Kang Cabe", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      // A replaced notification (same tag) should still buzz: it is news.
      renotify: Boolean(data.tag),
      lang: "id",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin
  ).href;

  event.waitUntil(
    (async () => {
      // Reuse an open window of the app rather than stacking new ones.
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              // An uncontrolled window cannot be navigated; focus is enough.
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});
