/// <reference lib="webworker" />

/**
 * EquipQR Service Worker (vite-plugin-pwa injectManifest source)
 *
 * Two responsibilities:
 *   1. Precache the SPA shell (index.html + hashed /assets/*) so the app boots
 *      instantly on repeat visits and works on flaky cellular / brief offline.
 *   2. Continue to handle Web Push notifications exactly the way the legacy
 *      `public/sw.js` did. The push handlers below are byte-for-byte equivalent
 *      to that file — `usePushNotifications.ts` resolves a registration whose
 *      scriptURL ends in `sw.js`, so this file MUST keep being emitted as
 *      `/sw.js` (configured in `vite.config.ts`).
 *
 * Strategy choices:
 *   - SPA shell: precache (cache-first via Workbox) on hashed Vite assets;
 *     navigation requests fall back to the cached `index.html` so the
 *     React Router can still mount when offline.
 *   - Supabase API traffic: all paths (/rest/, /auth/, /functions/, /realtime/)
 *     are NetworkOnly. Authenticated PostgREST GET responses contain
 *     tenant-scoped data; Cache Storage keys do not vary by Authorization header,
 *     so caching them risks cross-session/cross-user data exposure on shared
 *     devices. TanStack Query persistence (`src/lib/queryPersistence.ts`) is the
 *     designated offline-read layer and handles per-query cache keying safely.
 *     POST/PUT/DELETE/PATCH have no route and use the browser default (network-only).
 *   - Google Maps and other CDNs: untouched (NetworkOnly default).
 */

import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// ── 1. Push notification handlers (verbatim port of public/sw.js) ────────────

function isDevelopment(): boolean {
  return (
    self.location.origin.includes('localhost') ||
    self.location.origin.includes('127.0.0.1') ||
    self.location.origin.includes('192.168.')
  );
}

function log(...args: unknown[]): void {
  if (isDevelopment()) {
    // eslint-disable-next-line no-console -- intentional dev-only SW logging
    console.log(...args);
  }
}

function logError(...args: unknown[]): void {
  if (isDevelopment()) {
    console.error(...args);
  }
}

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  data?: {
    url?: string;
    notification_id?: string;
    type?: string;
  };
}

self.addEventListener('push', (event) => {
  log('[SW] Push received:', event);

  let data: PushPayload = {
    title: 'EquipQR',
    body: 'You have a new notification',
    data: {},
  };

  if (event.data) {
    try {
      data = { ...data, ...(event.data.json() as PushPayload) };
    } catch (e) {
      logError('[SW] Failed to parse push data:', e);
      data.body = event.data.text() || data.body;
    }
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: '/icons/EquipQR-Icon-Purple-Small.png',
    badge: '/icons/EquipQR-Icon-Purple-Small.png',
    // `vibrate`, `actions`, and `renotify` are valid Notification options
    // in all major browsers but not yet in lib.dom.ts; cast to any.
    ...({
      vibrate: [100, 50, 100],
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      renotify: true,
    } as Record<string, unknown>),
    data: {
      url: data.data?.url || data.url || '/dashboard/notifications',
      notificationId: data.data?.notification_id,
      type: data.data?.type,
      dateOfArrival: Date.now(),
    },
    requireInteraction: false,
    tag: data.data?.notification_id || 'equipqr-notification',
  };

  event.waitUntil(self.registration.showNotification(data.title || 'EquipQR', options));
});

self.addEventListener('notificationclick', (event) => {
  log('[SW] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen =
    (event.notification.data?.url as string | undefined) || '/dashboard/notifications';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then((focusedClient) => {
              if ('navigate' in focusedClient) {
                return focusedClient.navigate(urlToOpen);
              }
            });
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  log('[SW] Notification closed:', event.notification.tag);
});

self.addEventListener('pushsubscriptionchange', (event) => {
  const subscriptionEvent = event as PushSubscriptionChangeEvent;
  log('[SW] Push subscription changed');

  subscriptionEvent.waitUntil(
    self.registration.pushManager
      .subscribe(
        subscriptionEvent.oldSubscription?.options || {
          userVisibleOnly: true,
        }
      )
      .then((newSubscription) => {
        log('[SW] New subscription:', newSubscription.endpoint);
      })
      .catch((error) => {
        logError('[SW] Failed to re-subscribe to push notifications:', error);
        throw error;
      })
  );
});

// ── 2. Lifecycle (preserve previous skipWaiting / clientsClaim semantics) ────

self.addEventListener('install', () => {
  log('[SW] Installing service worker...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  log('[SW] Service worker activated');
  event.waitUntil(self.clients.claim());
});

// ── 3. Workbox precache (Vite-injected manifest) ─────────────────────────────

cleanupOutdatedCaches();

// `__WB_MANIFEST` is injected by vite-plugin-pwa at build time. In dev (where
// the plugin runs in `injectManifest` mode and no manifest is generated) the
// fallback `[]` keeps `precacheAndRoute` happy without throwing.
precacheAndRoute(self.__WB_MANIFEST ?? []);

// ── 4. Runtime caching ───────────────────────────────────────────────────────

// SPA navigation fallback: when offline, return the precached index.html so
// the React Router can mount and render cached content. The push-notification
// click handler still navigates inside the SPA shell.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'equipqr-pages-v1',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 32,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  })
);

// Static assets that aren't precached (icons, manifest, OG images, fonts
// served from /static and /icons). Hashed /assets/* are precached above.
registerRoute(
  ({ url, request }) =>
    url.origin === self.location.origin &&
    (request.destination === 'image' ||
      request.destination === 'font' ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/static/')),
  new CacheFirst({
    cacheName: 'equipqr-static-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 30 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Supabase Storage public objects (equipment images, team images, etc.).
// Safe to cache because the URL path encodes the bucket + object id.
registerRoute(
  ({ url }) =>
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.startsWith('/storage/v1/object/public/'),
  new CacheFirst({
    cacheName: 'equipqr-supabase-storage-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 7 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// All Supabase API traffic is NetworkOnly. Caching authenticated PostgREST
// GET responses in Cache Storage would risk cross-session tenant data exposure
// because cache keys do not vary by Authorization header. Offline data access
// is handled by TanStack Query persistence (src/lib/queryPersistence.ts).
registerRoute(
  ({ url }) =>
    url.hostname.endsWith('.supabase.co') &&
    (url.pathname.startsWith('/rest/') ||
      url.pathname.startsWith('/auth/') ||
      url.pathname.startsWith('/functions/') ||
      url.pathname.startsWith('/realtime/')),
  new NetworkOnly()
);

// Google Maps JS API and tiles: not our cache to manage; let the browser/SDK
// handle caching natively (the Maps SDK has its own offline behavior).

// ── 5. Catch handler for failed navigations ──────────────────────────────────

setCatchHandler(async ({ request }) => {
  if (request.mode === 'navigate') {
    // index.html is precached by Workbox into the precache store, not into
    // equipqr-pages-v1. matchPrecache() resolves the versioned precache key
    // so the SPA shell loads correctly on a first offline navigation.
    const precached = await matchPrecache('/index.html');
    if (precached) return precached;
  }
  return Response.error();
});
