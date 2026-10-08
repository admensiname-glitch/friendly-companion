const CACHE_NAME = "ensina-me-shell-v1";
const NOTIFICATION_ICON = "/ensina-me-icon.svg";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || "Você tem uma nova atualização no Ensina-me." };
  }

  const title = typeof payload.title === "string" && payload.title.trim()
    ? payload.title.slice(0, 120)
    : "Ensina-me";
  const body = typeof payload.body === "string" && payload.body.trim()
    ? payload.body.slice(0, 500)
    : "Há uma novidade na sua jornada de aprendizagem.";
  const target = typeof payload.url === "string" ? payload.url : "/app/dashboard";
  let safeUrl = "/app/dashboard";
  try {
    const parsed = new URL(target, self.location.origin);
    if (parsed.origin === self.location.origin) safeUrl = parsed.pathname + parsed.search + parsed.hash;
  } catch {
    // Keep the safe default route.
  }

  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_ICON,
    tag: typeof payload.tag === "string" ? payload.tag.slice(0, 100) : "ensina-me-update",
    data: { url: safeUrl },
    actions: [
      { action: "study", title: "Estudar agora" },
      { action: "dismiss", title: "Dispensar" },
    ],
    renotify: false,
    requireInteraction: false,
    timestamp: Date.now(),
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const target = event.notification?.data?.url || "/app/dashboard";
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(new URL(target, self.location.origin).href);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(new URL(target, self.location.origin).href);
  })());
});
