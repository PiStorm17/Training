// Offline cache for the Edinburgh 2027 training log. Your logged data is NOT stored here:
// it lives in IndexedDB and is never touched by this file or by app updates.
const VERSION = "e27-1.0.0";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(ASSETS.map(url => new Request(url, {cache: "reload"}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("e27-") && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from cache first so the app always opens offline; refresh the cache in the background.
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    let cached = await cache.match(req, {ignoreSearch: true});
    if (!cached && req.mode === "navigate") cached = await cache.match("./index.html");
    const network = fetch(req).then(res => {
      if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
      return res;
    }).catch(() => undefined);
    if (cached) { event.waitUntil(network); return cached; }
    const res = await network;
    return res || new Response("Offline, and this file isn't cached yet.", {status: 503, headers: {"Content-Type": "text/plain"}});
  })());
});
