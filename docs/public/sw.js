// fallow-ignore-file unused-file
/**
 * Kill-switch service worker for equipqr.info
 *
 * equipqr.info briefly served the EquipQR SPA (May 2026) and registered a
 * Workbox PWA worker at scope /. After the domain moved to the VitePress docs
 * project, returning visitors kept the stranded worker and its precached app
 * shell. This script replaces that registration on the next update check:
 * clear every Cache Storage bucket, reload open tabs, then unregister.
 */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));

      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      await Promise.all(
        windowClients.map((client) => {
          if ('navigate' in client) {
            return client.navigate(client.url);
          }
        })
      );

      await self.registration.unregister();
    })()
  );
});
