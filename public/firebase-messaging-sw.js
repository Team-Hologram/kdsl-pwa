// public/firebase-messaging-sw.js
// FCM Background Push Notification Service Worker

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDgWOSTiAICh10FBob2pAI4T8uhA5SrjOI',
  authDomain: 'kdrama-sl.firebaseapp.com',
  projectId: 'kdrama-sl',
  storageBucket: 'kdrama-sl.firebasestorage.app',
  messagingSenderId: '1035113702240',
  appId: '1:1035113702240:web:b74ccf4c5c9b734bff3405',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title ?? 'KDrama SL';
  const notificationOptions = {
    body: payload.notification?.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    image: payload.notification?.image,
    data: {
      ...payload.data,
      notificationId: payload.data?.notificationId,
      url: payload.data?.url ?? '/',
    },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: 'kdrama-notification',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};
  const url = data.notificationId
    ? `/notifications/${data.notificationId}`
    : (data.url ?? '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
