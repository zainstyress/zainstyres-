/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBqMtWeid9FsE_C-pUIvu226dGh3fLYe4Q',
  authDomain: 'zainstyres.firebaseapp.com',
  projectId: 'zainstyres',
  storageBucket: 'zainstyres.firebasestorage.app',
  messagingSenderId: '843198216171',
  appId: '1:843198216171:web:a4151805625f2648e20bae',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Zain\'s Tyres';
  const options = {
    body: payload.notification?.body || 'You have a new update.',
    icon: '/favicon.ico',
  };

  self.registration.showNotification(title, options);
});
