// Firebase Cloud Messaging Service Worker for Web Push Notifications
// This file MUST be in the public folder and named exactly 'firebase-messaging-sw.js'

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: 'AIzaSyDUDiFSpUPErRworaDcQ60ocXPbJSqEfNI',
  authDomain: 'gss-maasincity.firebaseapp.com',
  projectId: 'gss-maasincity',
  storageBucket: 'gss-maasincity.firebasestorage.app',
  messagingSenderId: '242899832730',
  appId: '1:242899832730:web:6b17cd9d0cece4ab483423',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'GSS Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/next.svg',
    badge: '/next.svg',
    tag: payload.data?.type || 'gss-notification',
    data: payload.data,
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Notification clicked:', event);
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  // Navigate based on notification type
  switch (data.type) {
    case 'new_job':
    case 'job_approved':
      url = data.jobId ? `/provider/jobs/${data.jobId}` : '/provider/jobs';
      break;
    case 'booking_accepted':
    case 'job_update':
    case 'counter_offer':
    case 'job_started':
    case 'job_completed':
      url = data.jobId ? `/client/bookings/${data.jobId}` : '/client/bookings';
      break;
    case 'new_message':
      url = data.conversationId ? `/chat/${data.conversationId}` : '/messages';
      break;
    case 'provider_approved':
      url = '/provider';
      break;
    default:
      url = '/notifications';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', url, data });
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
