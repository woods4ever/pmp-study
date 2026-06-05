const CACHE_NAME = 'pmp-study-v40';
const AUDIO_CACHE = 'pmp-audio-v40';

// Core app files - cached immediately on install
const CORE_FILES = [
  './',
  './index.html',
  './manifest.json'
];

// Audio files - cached on first access (lazy caching)
const AUDIO_FILES = [
  './audio/chapter_2.mp3',
  './audio/chapter_3.mp3',
  './audio/chapter_4.mp3',
  './audio/chapter_5.mp3',
  './audio/chapter_6.mp3',
  './audio/chapter_7.mp3',
  './audio/chapter_8.mp3',
  './audio/chapter_9.mp3',
  './audio/chapter_10.mp3',
  './audio/chapter_11.mp3',
  './audio/chapter_12.mp3',
  './audio/chapter_13.mp3',
  './audio/chapter_14.mp3',
  './audio/chapter_15.mp3'
];

// Install: cache core files immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching core files');
      return cache.addAll(CORE_FILES);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== AUDIO_CACHE)
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: serve from cache, fallback to network, cache audio on first load
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Audio files: cache-first with network fallback
  if (url.pathname.endsWith('.mp3')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(cache => {
        return cache.match(event.request).then(cached => {
          if (cached) {
            console.log('[SW] Audio from cache:', url.pathname);
            return cached;
          }
          console.log('[SW] Audio from network:', url.pathname);
          return fetch(event.request).then(response => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // All other files: cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
