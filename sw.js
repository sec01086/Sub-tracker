// Subscription Tracker Pro — Service Worker
// Only caches the small local app-shell (this page + manifest + icons) so the
// app is installable and can still open offline. All external calls (GitHub
// API, raw.githubusercontent.com, map tiles, fonts, CDN scripts) are left
// completely untouched — they always go straight to the network so data is
// never served stale.

const CACHE_NAME = 'subtracker-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests for the app shell itself.
  // Everything else (GitHub API/raw content, map tiles, CDN JS/CSS, fonts)
  // is left alone so the browser handles it normally — no caching, no
  // interception — to guarantee fresh data.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Keep the cached shell fresh in the background.
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
