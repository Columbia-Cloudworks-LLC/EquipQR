// fallow-ignore-file unused-file
/**
 * Kill-switch service worker for equipqr.info
 *
 * equipqr.info briefly served the EquipQR SPA (May 2026) and registered a
 * Workbox PWA worker at scope /. After the domain moved to the VitePress docs
 * project, returning visitors kept the stranded worker and its precached app
 * shell. This script replaces that registration on the next update check:
 * clear every Cache Storage bucket, reload open tabs onto a known-good docs
 * URL, then unregister.
 */

var SAFE_PATH_PREFIXES = [
  '/support',
  '/guides',
  '/how-to',
  '/pm-templates',
  '/integrations',
];

function isSafeDocsPath(pathname) {
  if (pathname === '/') {
    return true;
  }

  for (var i = 0; i < SAFE_PATH_PREFIXES.length; i++) {
    var prefix = SAFE_PATH_PREFIXES[i];
    if (
      pathname === prefix ||
      pathname.indexOf(prefix + '/') === 0
    ) {
      return true;
    }
  }

  return false;
}

function resolveSafeUrl(client) {
  try {
    var parsed = new URL(client.url);
    if (isSafeDocsPath(parsed.pathname)) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
  } catch (error) {
    // Fall through to the docs home page.
  }

  return '/';
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        var cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys.map(function (key) {
            return caches.delete(key).catch(function () {});
          })
        );

        var windowClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });

        await Promise.all(
          windowClients
            .filter(function (client) {
              return 'navigate' in client;
            })
            .map(function (client) {
              return client
                .navigate(resolveSafeUrl(client))
                .catch(function () {});
            })
        );
      } finally {
        await self.registration.unregister();
      }
    })()
  );
});
