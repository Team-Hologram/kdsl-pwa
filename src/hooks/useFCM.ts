'use client';
// src/hooks/useFCM.ts
// Uses dynamic imports for firebase/messaging to prevent crash on iOS < 16.4

import { useCallback, useEffect, useRef } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const FCM_TOKENS_COL = 'fcmTokens';
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '';
const STORAGE_KEY = 'kdramasl_pwa_device_id';

type FcmCapability = {
  canUseFcm: boolean;
  installedPwa: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  reason?: string;
};

type DeviceRegistration = {
  fcmToken?: string | null;
  fcmSupported: boolean;
  installedPwa: boolean;
  notificationPermission: FcmCapability['notificationPermission'];
  unsupportedReason?: string;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

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

function hasValidVapidKey() {
  return VAPID_KEY && VAPID_KEY !== 'REPLACE_WITH_YOUR_VAPID_KEY';
}

function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  const nav = navigator as NavigatorWithStandalone;
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

async function getFcmCapability(): Promise<FcmCapability> {
  if (typeof window === 'undefined') {
    return {
      canUseFcm: false,
      installedPwa: false,
      notificationPermission: 'unsupported',
      reason: 'server',
    };
  }

  const installedPwa = isStandalonePwa();
  const notificationPermission =
    'Notification' in window ? Notification.permission : 'unsupported';

  if (!installedPwa) {
    return {
      canUseFcm: false,
      installedPwa,
      notificationPermission,
      reason: 'not-installed-pwa',
    };
  }

  if (!window.isSecureContext) {
    return {
      canUseFcm: false,
      installedPwa,
      notificationPermission,
      reason: 'insecure-context',
    };
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      canUseFcm: false,
      installedPwa,
      notificationPermission,
      reason: 'missing-web-push-api',
    };
  }

  if (!hasValidVapidKey()) {
    return {
      canUseFcm: false,
      installedPwa,
      notificationPermission,
      reason: 'missing-vapid-key',
    };
  }

  try {
    const { isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    return {
      canUseFcm: supported,
      installedPwa,
      notificationPermission,
      reason: supported ? undefined : 'firebase-messaging-unsupported',
    };
  } catch (e) {
    console.warn('[FCM] Support check failed:', e);
    return {
      canUseFcm: false,
      installedPwa,
      notificationPermission,
      reason: 'firebase-messaging-import-failed',
    };
  }
}

export function useFCM() {
  const registered = useRef(false);
  const capability = useRef<FcmCapability | null>(null);

  const saveDevice = useCallback(async (registration: DeviceRegistration) => {
    const deviceId = getOrCreateDeviceId();
    if (!deviceId) return;

    try {
      await setDoc(doc(db, FCM_TOKENS_COL, deviceId), {
        deviceId,
        token: registration.fcmToken ?? null,
        fcmToken: registration.fcmToken ?? null,
        platform: 'pwa-ios',
        fcmSupported: registration.fcmSupported,
        installedPwa: registration.installedPwa,
        notificationPermission: registration.notificationPermission,
        unsupportedReason: registration.unsupportedReason ?? null,
        userAgent: navigator.userAgent.slice(0, 200),
        updatedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      }, { merge: true });
      console.log('[FCM] Device registered in Firestore');
    } catch (e) {
      console.warn('[FCM] Firestore write failed:', e);
    }
  }, []);

  const getAndSaveToken = useCallback(async (currentCapability: FcmCapability) => {
    if (!currentCapability.installedPwa) return;

    if (!currentCapability.canUseFcm) {
      await saveDevice({
        fcmToken: null,
        fcmSupported: false,
        installedPwa: currentCapability.installedPwa,
        notificationPermission: currentCapability.notificationPermission,
        unsupportedReason: currentCapability.reason,
      });
      return;
    }

    if (Notification.permission !== 'granted') {
      await saveDevice({
        fcmToken: null,
        fcmSupported: true,
        installedPwa: currentCapability.installedPwa,
        notificationPermission: Notification.permission,
      });
      return;
    }

    try {
      const { getMessaging, getToken } = await import('firebase/messaging');
      const { default: app } = await import('@/lib/firebase');
      const serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const messaging = getMessaging(app);
      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration,
      });

      await saveDevice({
        fcmToken: fcmToken || null,
        fcmSupported: true,
        installedPwa: currentCapability.installedPwa,
        notificationPermission: Notification.permission,
        unsupportedReason: fcmToken ? undefined : 'empty-fcm-token',
      });
    } catch (e) {
      console.warn('[FCM] Token registration failed:', e);
      await saveDevice({
        fcmToken: null,
        fcmSupported: false,
        installedPwa: currentCapability.installedPwa,
        notificationPermission: Notification.permission,
        unsupportedReason: 'token-registration-failed',
      });
    }
  }, [saveDevice]);

  const requestPermission = useCallback(async () => {
    const currentCapability = capability.current ?? await getFcmCapability();
    capability.current = currentCapability;

    if (!currentCapability.canUseFcm || !('Notification' in window)) {
      await getAndSaveToken(currentCapability);
      return;
    }

    const permission = await Notification.requestPermission();
    await getAndSaveToken({
      ...currentCapability,
      notificationPermission: permission,
    });
  }, [getAndSaveToken]);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;
    let removePermissionListeners: (() => void) | undefined;

    const register = async () => {
      const currentCapability = await getFcmCapability();
      capability.current = currentCapability;

      if (!currentCapability.canUseFcm) {
        await getAndSaveToken(currentCapability);
        return;
      }

      if (Notification.permission === 'granted') {
        await getAndSaveToken({
          ...currentCapability,
          notificationPermission: 'granted',
        });
        return;
      }

      if (Notification.permission === 'denied') {
        await saveDevice({
          fcmToken: null,
          fcmSupported: true,
          installedPwa: currentCapability.installedPwa,
          notificationPermission: Notification.permission,
        });
        return;
      }

      let handled = false;
      const requestOnInteraction = () => {
        if (handled) return;
        handled = true;
        removePermissionListeners?.();
        void requestPermission();
      };

      window.addEventListener('pointerdown', requestOnInteraction, { once: true, capture: true });
      window.addEventListener('click', requestOnInteraction, { once: true, capture: true });
      window.addEventListener('keydown', requestOnInteraction, { once: true, capture: true });
      removePermissionListeners = () => {
        window.removeEventListener('pointerdown', requestOnInteraction, { capture: true });
        window.removeEventListener('click', requestOnInteraction, { capture: true });
        window.removeEventListener('keydown', requestOnInteraction, { capture: true });
      };
    };

    void register();
    return () => {
      removePermissionListeners?.();
    };
  }, [getAndSaveToken, requestPermission, saveDevice]);
}
