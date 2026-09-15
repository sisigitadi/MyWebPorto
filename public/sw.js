/* Service worker minimal SigitOS — fallback offline, tanpa precache aset.
 * Sengaja TIDAK meng-cache HTML/JS dinamis agar tidak pernah menyajikan basi.
 * Versi cache: naikkan bila strategi berubah agar SW lama tergantikan. */
const CACHE_VERSION = "sigitos-v1";
const OFFLINE_URL = "/offline";
// /manifest.webmanifest dihapus: situs tidak lagi installable (pwa install
// dimatikan), tetapi fallback offline tetap aktif lewat service worker ini.
const CORE_ASSETS = [OFFLINE_URL, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
      .catch(() => undefined)
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Navigasi: network-first, jatuh ke /offline bila gagal total.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((res) => res || Response.error()))
    );
  }
});
