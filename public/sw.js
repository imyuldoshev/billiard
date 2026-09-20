const CACHE_NAME = 'bilyard-klub-v2'; // Updated cache name
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Network-First strategy
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Option to dynamically cache fetched assets could go here
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
