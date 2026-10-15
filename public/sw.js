const CACHE_NAME = "ensina-me-mobile-shell-v2";
const APP_ENTRY = "/mobile";
const STATIC_ASSETS = ["/manifest.webmanifest", "/ensina-me-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(STATIC_ASSETS.map(async (asset) => {
      try {
        const response = await fetch(asset, { cache: "reload" });
        if (response.ok) await cache.put(asset, response);
      } catch {
        // The app remains usable when a static asset cannot be cached.
      }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("ensina-me-") && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// Only the public app shell and static branding are cached. Authenticated data,
// Supabase responses, and study records are never written to the Cache API.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && url.pathname === APP_ENTRY) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(APP_ENTRY, response.clone());
        }
        return response;
      } catch {
        const cached = await caches.match(APP_ENTRY);
        if (cached) return cached;
        return new Response("Você está offline. Conecte-se à internet para abrir o Ensina-me.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })());
    return;
  }

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(url.pathname);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(url.pathname, response.clone());
      }
      return response;
    })());
  }

  // Cache same-origin build assets after first use so the app shell can reopen offline.
  if (["script", "style", "font", "image"].includes(request.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
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
  const target = typeof payload.url === "string" ? payload.url : APP_ENTRY;
  let safeUrl = APP_ENTRY;
  try {
    const parsed = new URL(target, self.location.origin);
    if (parsed.origin === self.location.origin) safeUrl = parsed.pathname + parsed.search + parsed.hash;
  } catch {
    // Keep the safe default route.
  }

  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: "/ensina-me-icon.svg",
    badge: "/ensina-me-icon.svg",
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
  const target = event.notification?.data?.url || APP_ENTRY;
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
