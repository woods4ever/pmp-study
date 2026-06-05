const CACHE_VERSION = 'pmp-study-v40b';
const AUDIO_CACHE = 'pmp-audio-v40';

// Core app files - cached on install
const CORE_FILES = [
  './',
  './index.html',
  './manifest.json'
];

// Install: cache core files, activate immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      console.log('[SW] Caching core files');
      return cache.addAll(CORE_FILES);
    })
  );
  self.skipWaiting(); // Activate new SW immediately
});

// Activate: delete ALL old caches, claim clients immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_VERSION && key !== AUDIO_CACHE)
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch strategy:
// - HTML/JS/JSON: Network-first (always try to get fresh, fall back to cache)
// - Audio: Cache-first (big files, only fetch from network if not cached)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Audio files: cache-first (they never change, too big to re-download)
  if (url.pathname.endsWith('.mp3')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(cache => {
        return cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // Everything else: network-first (always get latest, cache as fallback for offline)
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok) {
        const responseClone = response.clone();
        caches.open(CACHE_VERSION).then(cache => {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(() => {
      // Network failed — serve from cache (offline mode)
      return caches.match(event.request);
    })
  );
});