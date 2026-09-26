// Service worker - cache app shell, żeby appka działała offline po dodaniu do ekranu głównego.
const CACHE_NAZWA = 'majster-v4';
const PLIKI_DO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/calc.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAZWA).then((cache) => cache.addAll(PLIKI_DO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nazwy) =>
      Promise.all(nazwy.filter((n) => n !== CACHE_NAZWA).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((odpowiedz) => {
          const kopia = odpowiedz.clone();
          caches.open(CACHE_NAZWA).then((cache) => cache.put(event.request, kopia));
          return odpowiedz;
        })
        .catch(() => cached);
    })
  );
});
