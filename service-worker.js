const CACHE_NAME = 'sklad-u-havrana-v1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './firebase-config.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// App shell (HTML/CSS/JS) se servíruje z cache offline.
// Data appky (Firestore/Storage) jdou vždy na síť - o offline funkčnost
// databáze se stará Firestore offline persistence v firebase-config.js.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // necachovat Firebase/CDN požadavky

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => cached);
    })
  );
});
