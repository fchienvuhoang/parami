// Only the generic launch screen, artwork and immutable application code are cached.
// Authenticated HTML, API responses and bank statements always use the network.
importScripts("/pwa-version.js");
const LAUNCH_CACHE = "parami-launch-" + self.DHAMMA_BUILD;
const LAUNCH_PATH = "/khoi-dong";
const OFFLINE_URL = "/offline.html";
const LAUNCH_ASSETS = [OFFLINE_URL,"/icons/icon-192.png", "/splash/iphone-430x932-3.png"];
const isStaticCode = (url) => url.origin === self.location.origin && url.pathname.startsWith("/_next/static/") && /\.(js|css|woff2?)$/.test(url.pathname);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(LAUNCH_CACHE);
    const response = await fetch(LAUNCH_PATH, { cache: "reload" });
    if (!response.ok || response.redirected || !response.headers.get("content-type")?.includes("text/html")) throw new Error("Launch screen unavailable");
    const html = await response.clone().text();
    // Include public hashed scripts/styles so startup doesn't wait for their network requests.
    const code = [...html.matchAll(/(?:src|href)="([^"<>]+)"/g)]
      .map((match) => new URL(match[1].replaceAll("&amp;", "&"), self.location.origin))
      .filter(isStaticCode).map((url) => url.href);
    await cache.addAll([...new Set([...LAUNCH_ASSETS, ...code])]);
    await cache.put(LAUNCH_PATH, response);
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (event) => event.waitUntil((async () => {
  if (self.registration.navigationPreload) {
    try { await self.registration.navigationPreload.disable(); } catch { /* Optional optimization. */ }
  }
  await self.clients.claim();
  const names = await caches.keys();
  await Promise.all(names.filter((name) => (name.startsWith("parami-launch-") || name.startsWith("parami-offline-")) && name !== LAUNCH_CACHE).map((name) => caches.delete(name)));
})()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (isStaticCode(url) || (LAUNCH_ASSETS.includes(url.pathname) && !url.search)) {
    event.respondWith((async () => {
      const cache = await caches.open(LAUNCH_CACHE);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      // Only cache build-versioned, public code; never cache arbitrary page content.
      if (response.ok && isStaticCode(url)) await cache.put(event.request, response.clone());
      return response;
    })());
    return;
  }
  if (event.request.mode !== "navigate") return;
  event.respondWith((async () => {
    const cache = await caches.open(LAUNCH_CACHE);
    const launch = await cache.match(LAUNCH_PATH);
    // Existing installations still open '/'. Redirect locally to the cached launch screen.
    // Client-side navigation from the launch screen uses RSC, so it bypasses this branch.
    if (launch && ["/", "/launch.html"].includes(url.pathname)) {
      const target = new URL(LAUNCH_PATH, url.origin);
      if (url.search) target.searchParams.set("next", "/" + url.search);
      return Response.redirect(target.href, 302);
    }
    if (launch && url.pathname === LAUNCH_PATH) return launch;
    try {
      return await fetch(event.request);
    } catch {
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
      return new Response(
        '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Parami – Mất kết nối</title><body style="font:18px system-ui;padding:32px;background:#fffaf0"><h1>Chưa có kết nối mạng</h1><p>Kết nối Internet để mở Parami và nhập sao kê.</p><button onclick="location.reload()">Thử lại</button></body></html>',
        { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
      );
    }
  })());
});
