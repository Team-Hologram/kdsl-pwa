'use client';
// src/hooks/useFCM.ts
// Uses dynamic imports for firebase/messaging to prevent crash on iOS < 16.4

import { useEffect, useRef } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const FCM_TOKENS_COL = 'fcmTokens';
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '';
const STORAGE_KEY = 'kdramasl_pwa_device_id';

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = `pwa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch { return ''; }
}

export function useFCM() {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;

    const register = async () => {
      const deviceId = getOrCreateDeviceId();
      if (!deviceId) return;

      let fcmToken: string | null = null;
      let fcmSupported = false;

      try {
        // Dynamic import — prevents module-level crash on iOS < 16.4
        const { isSupported, getMessaging, getToken } = await import('firebase/messaging');
        const { default: app } = await import('@/lib/firebase');

        const supported = await isSupported();
        if (
          supported &&
          VAPID_KEY &&
          VAPID_KEY !== 'REPLACE_WITH_YOUR_VAPID_KEY' &&
          'Notification' in window
        ) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const messaging = getMessaging(app);
            fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
            fcmSupported = true;
          }
        }
      } catch (e) {
        // FCM not supported on this iOS version / browser — use fallback UUID
        console.warn('[FCM] FCM unavailable, using fallback device ID:', e);
      }

      // Always write a Firestore document — counts total installs, even without FCM
      const tokenToSave = fcmToken ?? deviceId;
      try {
        await setDoc(doc(db, FCM_TOKENS_COL, tokenToSave), {
          token: tokenToSave,
          fcmToken: fcmToken ?? null,
          deviceId,
          platform: 'pwa-ios',
          fcmSupported,
          userAgent: navigator.userAgent.slice(0, 200),
          updatedAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
        }, { merge: true });
        console.log('[FCM] Device registered in Firestore');
      } catch (e) {
        console.warn('[FCM] Firestore write failed:', e);
      }
    };

    // Delay slightly to not block initial render
    const t = setTimeout(register, 2000);
    return () => clearTimeout(t);
  }, []);
}
