// Service worker - cache app shell, żeby appka działała offline po dodaniu do ekranu głównego.
const CACHE_NAZWA = 'majster-v33';
const PLIKI_DO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/motyw.js',
  './js/app.js',
  './js/db.js',
  './js/calc.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './fonts/oswald-700-latin.woff2',
  './fonts/oswald-700-latin-ext.woff2',
  './icons-ui/camera.svg',
  './icons-ui/x.svg',
  './icons-ui/clipboard-check.svg',
  './icons-ui/clipboard-list.svg',
  './icons-ui/door-open.svg',
  './icons-ui/droplets.svg',
  './icons-ui/folder.svg',
  './icons-ui/file-text.svg',
  './icons-ui/hard-hat.svg',
  './icons-ui/check-circle.svg',
  './icons-ui/grid-2x2.svg',
  './icons-ui/grid-3x3.svg',
  './icons-ui/hammer.svg',
  './icons-ui/lock.svg',
  './icons-ui/home.svg',
  './icons-ui/layers.svg',
  './icons-ui/paint-bucket.svg',
  './icons-ui/paintbrush.svg',
  './icons-ui/ruler.svg',
  './icons-ui/settings.svg',
  './icons-ui/sparkles.svg',
  './icons-ui/trash-2.svg',
  './icons-ui/utensils-crossed.svg',
  './icons-ui/wand-2.svg',
  './icons-ui/zap.svg',
  './icons-ui/bar-chart-3.svg',
  './icons-ui/chevron-left.svg',
  './icons-ui/chevron-right.svg',
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
          // Cache'ować tylko udaną odpowiedź - inaczej błąd 404/500 (np. literówka
          // w nazwie pliku po wdrożeniu) zapisałby się jako "poprawna" treść i byłby
          // serwowany offline aż do zmiany CACHE_NAZWA.
          if (odpowiedz.ok) {
            const kopia = odpowiedz.clone();
            caches.open(CACHE_NAZWA).then((cache) => cache.put(event.request, kopia));
          }
          return odpowiedz;
        })
        .catch(() => {
          // Brak sieci i nic w cache dla tego zasobu (`cached` powyżej było puste,
          // inaczej nie dotarlibyśmy tutaj). Dla nawigacji (otwarcie/odświeżenie
          // strony) jedyny sensowny ratunek offline to podstawić zapisaną powłokę
          // aplikacji zamiast twardego błędu sieci.
          if (event.request.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        });
    })
  );
});
