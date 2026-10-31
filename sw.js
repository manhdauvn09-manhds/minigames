const CACHE_NAME = 'minigames-v3';
const PRECACHE = [
  '/',
  '/game-platform.js',
  '/game-platform.css',
  '/favicon.svg',
  '/manifest.webmanifest',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Web Push ──────────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'MiniGames', body: '', url: '/' };
  try { if (e.data) data = Object.assign(data, e.data.json()); } catch { if (e.data) data.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: data.url || '/' },
    vibrate: [80, 40, 80],
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if ('focus' in c) { c.navigate(target); return c.focus(); } }
      return self.clients.openWindow(target);
    })
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Same-origin only — never touch cross-origin (Google, Cloudflare, etc.)
  if (url.origin !== self.location.origin) return;

  // API endpoints & health: network-only, never cache
  if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') {
    e.respondWith(fetch(request).catch(() =>
      new Response('{"ok":false}', { headers: { 'Content-Type': 'application/json' } })
    ));
    return;
  }

  // HTML / navigations: network-first (always fresh on deploy), fall back to cache offline
  const isHTML = request.mode === 'navigate' ||
                 (request.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    e.respondWith(
      fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      }).catch(() => caches.match(request).then(c => c || caches.match('/')))
    );
    return;
  }

  // Static assets (js/css/svg/img): cache-first, refresh in background
  e.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
