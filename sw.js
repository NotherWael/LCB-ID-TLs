const CACHE_NAME = 'lcb-id-cache-v1';
const urlsToCache = [
  '/LCB-ID-TLs/',
  '/LCB-ID-TLs/index.html',
  '/LCB-ID-TLs/style.css',
  '/LCB-ID-TLs/script.js',
  '/LCB-ID-TLs/assets/background.png',
  '/LCB-ID-TLs/assets/UI_Hover.wav',
  '/LCB-ID-TLs/assets/UI_Click.wav',
  '/LCB-ID-TLs/assets/Main Menu Theme.wav',
  '/LCB-ID-TLs/assets/music_on.png',
  '/LCB-ID-TLs/assets/music_off.png',
  '/LCB-ID-TLs/assets/Back.png',
  '/LCB-ID-TLs/assets/channels4_profile.jpg',
  '/LCB-ID-TLs/assets/overlay000.png',
  '/LCB-ID-TLs/assets/overlayWalp.png',
  '/LCB-ID-TLs/assets/Yi_Sang.png',
  '/LCB-ID-TLs/assets/Faust.png',
  '/LCB-ID-TLs/assets/Don_Quixote.png',
  '/LCB-ID-TLs/assets/Ryōshū.png',
  '/LCB-ID-TLs/assets/Meursault.png',
  '/LCB-ID-TLs/assets/Hong_Lu.png',
  '/LCB-ID-TLs/assets/Heathcliff.png',
  '/LCB-ID-TLs/assets/Ishmael.png',
  '/LCB-ID-TLs/assets/Rodion.png',
  '/LCB-ID-TLs/assets/Sinclair.png',
  '/LCB-ID-TLs/assets/Outis.png',
  '/LCB-ID-TLs/assets/Gregor.png',
  '/LCB-ID-TLs/assets/000.png'
];

// Install event: cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event: serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          networkResponse => {
            // Optionally cache new requests here
            return networkResponse;
          }
        );
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});