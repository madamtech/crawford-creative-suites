/* Crawford Creative Suites portals · service worker
   Makes the portals installable and lets them open offline.
   Every request goes to the network first, so a fresh refresh or page update always wins.
   When offline, the last cached copy is shown, and the page's "as of" stamp and stale
   warning tell you how old it is.
   Refresh-Portals.ps1 -Publish rewrites VERSION so installed apps pick up new pages. */
const VERSION = 'dev';
const CACHE = 'ccs-portals-' + VERSION;
const SHELL = [
  './', './index.html',
  './madam-allure-portal.html', './allure-fusions-portal.html', './ai-authoritech-portal.html', './morning-dashboard.html', './skool-community-portal.html',
  './madam-allure.webmanifest', './allure-fusions.webmanifest', './ai-authoritech.webmanifest', './morning-dashboard.webmanifest',
  './icons/ma-192.png', './icons/af-192.png', './icons/at-192.png', './icons/cs-192.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('ccs-portals-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // fonts etc. go straight to the network
  // Only the portal files: anything else on the same server (like the public website in /site/) is left alone.
  const base = new URL('./', self.registration.scope).pathname, rel = url.pathname.startsWith(base) ? url.pathname.slice(base.length) : null;
  if (rel === null || !(rel === '' || /^[^/]+\.(html|webmanifest)$/.test(rel) || /^(data|modules|icons|brand)\//.test(rel))) return;
  // Network first for everything, so a new refresh or page update always wins.
  // The cached copy is used only when offline; the page's "as of" stamp shows its age.
  // cache:'no-cache' asks the server whether the file changed, so the browser never shows yesterday's data.
  e.respondWith(fetch(req, { cache: 'no-cache' }).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req)));
});
