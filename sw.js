// CRMicro Service Worker
const CACHE_NAME = 'crmicro-v1.0.3';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/js/productConfig.js',
  '/js/app.js',
  '/js/db.js',
  '/js/db-supabase.js',
  '/js/supabaseClient.js',
  '/js/notesRuntime.js',
  '/js/notesMigrationRuntime.js',
  '/js/notesRecoveryUi.js',
  '/assets/beautician-bg.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.all(
          urlsToCache.map((url) =>
            cache.add(url).catch((error) => {
              console.warn('[SW] Failed to cache', url, error);
            })
          )
        );
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Fetch event - serve from cache when offline, but always check network first for JS/CSS
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isJS = url.pathname.endsWith('.js');
  const isCSS = url.pathname.endsWith('.css');
  const isHTML = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/';

  // For HTML/app shell, prefer network to avoid stale startup bundles.
  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // For JS and CSS files, always try network first to get updates
  if (isJS || isCSS) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If network request succeeds, update cache and return response
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, fall back to cache
          return caches.match(event.request);
        })
    );
  } else {
    // For other files (images, etc.), use cache-first strategy
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request);
        })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Handle offline/online status
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

