// Service Worker for AthletOS with Vite asset cache-busting

let CACHE_NAME = 'athletos-cache';

// Helper to fetch and parse manifest.json, returning all asset URLs
async function getViteAssets() {
  const response = await fetch('/manifest.json', {cache: 'no-store'});
  const manifest = await response.json();
  const assets = new Set();
  let mainHash = '';
  for (const entry of Object.values(manifest)) {
    if (entry.file) {
      assets.add('/' + entry.file);
      if (!mainHash && entry.isEntry) {
        // Use the first entry's hash for cache versioning
        const match = entry.file.match(/\.(\w{8})\./);
        if (match) mainHash = match[1];
      }
    }
    if (entry.css) {
      entry.css.forEach(css => assets.add('/' + css));
    }
    if (entry.imports) {
      entry.imports.forEach(imp => {
        if (manifest[imp] && manifest[imp].file) {
          assets.add('/' + manifest[imp].file);
        }
      });
    }
  }
  // Add static assets
  assets.add('/');
  assets.add('/manifest.json');
  assets.add('/favicon.ico');
  assets.add('/icons/icon-192x192.png');
  assets.add('/icons/icon-256x256.png');
  assets.add('/icons/icon-384x384.png');
  assets.add('/icons/icon-512x512.png');
  return {assets: Array.from(assets), mainHash};
}

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const {assets, mainHash} = await getViteAssets();
      CACHE_NAME = 'athletos-cache-' + (mainHash || Date.now());
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(assets);
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Remove old caches
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(key => key.startsWith('athletos-cache-') && key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
      // Claim clients immediately
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const {request} = event;
  // Network-first for navigation (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Optionally update cache
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(request))
    );
    return;
  }
  // Cache-first for other assets
  event.respondWith(
    caches.match(request).then(response => response || fetch(request))
  );
}); 