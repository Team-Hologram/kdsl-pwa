// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

// Safe singleton — never throws even if config is missing
const app = (() => {
  try {
    return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  } catch (e) {
    console.error('[Firebase] initializeApp failed:', e);
    return getApps()[0];
  }
})();

export const db = (() => {
  try {
    if (typeof window !== 'undefined') {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    }
    return getFirestore(app);
  } catch (e) {
    console.warn('[Firebase] persistent cache unavailable, using default Firestore:', e);
    return getFirestore(app);
  }
})();

export default app;
