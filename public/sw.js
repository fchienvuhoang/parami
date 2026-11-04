const CACHE_NAME = "parami-offline-v4";
const OFFLINE_URL = "/offline.html";
const LAUNCH_ASSETS = ["/launch.html", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL, ...LAUNCH_ASSETS])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("parami-offline-") && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

// Only public launch assets and the offline page are cached. Financial data and authenticated responses
// always come from the server, including after the user signs out.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (LAUNCH_ASSETS.includes(url.pathname) && !url.search) {
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) =>
      (await cache.match(event.request)) || fetch(event.request),
    ));
    return;
  }
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(async () => {
    return (await caches.match(OFFLINE_URL)) || new Response("Không có kết nối mạng.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }));
});
