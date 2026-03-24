const CACHE_NAME = 'medi-sqr-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/quiz.html',
  '/admin.html',
  '/login.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/admin.js',
  '/js/login.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});
