/* Firebase Cloud Messaging & Background Push Service Worker for 407 ACTG ORM */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: '407 ACTG ORM Alert', body: event.data.text() } };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || '407 ACTG ORM Alert';
  const options = {
    body: notification.body || data.body || 'Operational Risk Management update requires attention.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.ormId || 'orm-alert',
    data: {
      url: data.url || '/',
      ormId: data.ormId || '',
    },
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
