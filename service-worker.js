/**
 * SAMX-VM Enterprise Service Worker
 * Version: 1.7.1
 * Cache Version: samx-vm-v1.7.1
 * Strategy: Cache First for core assets with Network Fallback, IndexedDB offline persistence
 */

const CACHE_NAME = 'samx-vm-v1.7.1';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './public/manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './apple-touch-icon.png',
  './favicon.ico',
  './assets/alshiak_logo.png',
  './assets/alshiak_logo_2x.png'
];

// Install Event: Precaching core shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('ServiceWorker: Some assets failed to precache during install', err);
      });
    })
  );
});

// Activate Event: Purge old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('samx-vm-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('ServiceWorker: Removing old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache First for static assets, Network First for /api/ routes
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // API calls: Network-only with error fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'offline', offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Static Assets and HTML: Stale-While-Revalidate / Cache First with fetch fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch update in background for revalidation
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
        }).catch(() => {/* Offline */});

        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Cache successful local asset responses
        if (networkResponse && networkResponse.status === 200 && (url.origin === location.origin || url.hostname.includes('unpkg.com') || url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com'))) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('/');
        }
      });
    })
  );
});
