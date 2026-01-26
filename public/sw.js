/**
 * EquipQR Service Worker
 * 
 * Handles Web Push notifications for the PWA.
 * 
 * Features:
 * - Displays push notifications with EquipQR branding
 * - Handles notification click to navigate to relevant page
 * - Supports notification actions (view, dismiss)
 */

// Cache name for any future caching needs
const CACHE_NAME = 'equipqr-v1';

/**
 * Push event handler
 * Receives push messages from the server and displays them as notifications
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = {
    title: 'EquipQR',
    body: 'You have a new notification',
    data: {},
  };

  // Try to parse the push payload
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error('[SW] Failed to parse push data:', e);
      // Try as text
      data.body = event.data.text() || data.body;
    }
  }

  // Notification options
  const options = {
    body: data.body,
    icon: '/icons/EquipQR-Icon-Purple-Small.png',
    badge: '/icons/EquipQR-Icon-Purple-Small.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.data?.url || data.url || '/dashboard/notifications',
      notificationId: data.data?.notification_id,
      type: data.data?.type,
      dateOfArrival: Date.now(),
    },
    // Action buttons
    actions: [
      {
        action: 'view',
        title: 'View',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
    // Auto-close after 30 seconds
    requireInteraction: false,
    tag: data.data?.notification_id || 'equipqr-notification',
    renotify: true,
  };

  // Show the notification
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Notification click handler
 * Opens the app and navigates to the relevant page
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  // Close the notification
  event.notification.close();

  // Handle action buttons
  if (event.action === 'dismiss') {
    // Just close, don't navigate
    return;
  }

  // Get the URL to open
  const urlToOpen = event.notification.data?.url || '/dashboard/notifications';

  // Focus an existing window or open a new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window/tab open with the app
      for (const client of windowClients) {
        // If we find an existing window, focus it and navigate
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            // Navigate to the notification URL
            if ('navigate' in focusedClient) {
              return focusedClient.navigate(urlToOpen);
            }
          });
        }
      }
      // No existing window found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * Notification close handler
 * Can be used for analytics or cleanup
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
  // Could send analytics about dismissed notifications here
});

/**
 * Service worker install event
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

/**
 * Service worker activate event
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated');
  // Take control of all pages immediately
  event.waitUntil(clients.claim());
});

/**
 * Handle push subscription change (when browser renews subscription)
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
  
  // Re-subscribe and update the server
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription?.options || {
      userVisibleOnly: true,
    }).then((newSubscription) => {
      // Send the new subscription to the server
      // This would need to call an endpoint to update the subscription
      console.log('[SW] New subscription:', newSubscription.endpoint);
      // Note: The client-side hook should handle re-syncing subscriptions
      // when the user next opens the app
    })
  );
});
