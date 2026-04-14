const CACHE_NAME = 'mb-v8';
const ASSETS = ['./', './index.html', './manifest.json', 'https://cdn.jsdelivr.net/npm/chart.js'];

const EXTERNAL_API_HOSTS = ['api.open-meteo.com', 'api.rss2json.com'];
const CDN_HOSTS = ['cdn.jsdelivr.net'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // CDN resources (Chart.js): CACHE-FIRST (serve from cache, fall back to network)
  if (CDN_HOSTS.some(h => url.hostname === h)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return response;
        });
      }).catch(() => new Response('/* CDN resource unavailable offline */', {
        headers: { 'Content-Type': 'application/javascript' }
      }))
    );
    return;
  }

  // External API calls (Open-Meteo, rss2json): STALE-WHILE-REVALIDATE
  // Return cached response immediately, then update cache in background
  if (EXTERNAL_API_HOSTS.some(h => url.hostname === h)) {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(e.request).then(cached => {
          const networkFetch = fetch(e.request).then(response => {
            cache.put(e.request, response.clone());
            return response;
          }).catch(() => null);

          // Return cached immediately if available, otherwise wait for network
          if (cached) {
            // Fire-and-forget: update cache in background
            networkFetch;
            return cached;
          }
          return networkFetch.then(response => {
            return response || new Response('{"error":"offline"}', {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        });
      })
    );
    return;
  }

  // Other external hosts: network only
  if (url.hostname !== location.hostname) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', {
      headers: { 'Content-Type': 'application/json' }
    })));
    return;
  }

  // App shell: NETWORK-FIRST (always get latest when online, cache as offline backup)
  e.respondWith(
    fetch(e.request).then(response => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return response;
    }).catch(() => caches.match(e.request).then(cached => {
      return cached || new Response('<h1>Offline</h1><p>Nincs internetkapcsolat és nincs cached verzió.</p>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }))
  );
});

// Background Sync: retry failed requests when connectivity is restored
self.addEventListener('sync', e => {
  if (e.tag === 'sync-offline-changes') {
    e.waitUntil(replayOfflineChanges());
  }
});

async function replayOfflineChanges() {
  try {
    const db = await openSyncDB();
    const tx = db.transaction('outbox', 'readwrite');
    const store = tx.objectStore('outbox');
    const requests = await getAllFromStore(store);

    for (const entry of requests) {
      try {
        await fetch(entry.url, {
          method: entry.method,
          headers: entry.headers,
          body: entry.body
        });
        // Remove successfully synced entry
        const deleteTx = db.transaction('outbox', 'readwrite');
        deleteTx.objectStore('outbox').delete(entry.id);
      } catch (err) {
        // Will retry on next sync event
        break;
      }
    }
  } catch (err) {
    // IndexedDB not available or empty, nothing to sync
  }
}

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('sw-sync', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
