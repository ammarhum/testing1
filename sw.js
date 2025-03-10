// Service Worker for Prayer Times PWA
const CACHE_NAME = 'prayer-times-v1';
const ASSETS_TO_CACHE = [
  '/testing/',
  '/testing/index.html',
  '/testing/manifest.json',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap',
  'https://www.transparenttextures.com/patterns/subtle-white-feathers.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) {
            console.log('Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, then network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests like those for Google Analytics
  if (event.request.url.startsWith(self.location.origin) || 
      event.request.url.includes('fonts.googleapis.com') || 
      event.request.url.includes('transparenttextures.com')) {
    
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then(response => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response since it can only be consumed once
          let responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then(cache => {
            // Add to cache for future use
            cache.put(event.request, responseToCache);
          });
          
          return response;
        }).catch(() => {
          // If fetch fails (offline), show fallback content for HTML requests
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
    );
  }
});

// Cache prayer API responses for offline use
self.addEventListener('fetch', event => {
  if (event.request.url.includes('api.aladhan.com')) {
    event.respondWith(
      caches.open('prayer-times-api-cache').then(cache => {
        return fetch(event.request).then(response => {
          // Cache a copy of the response
          cache.put(event.request, response.clone());
          return response;
        }).catch(() => {
          // If network request fails, try to get from cache
          return cache.match(event.request);
        });
      })
    );
  }
});
