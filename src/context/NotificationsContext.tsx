'use client';
// src/context/NotificationsContext.tsx
// Mirrors RN NotificationContext — Firestore real-time + localStorage read status

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppNotification } from '@/lib/types';
import { useAppSettings } from './AppSettingsContext';

const CACHE_KEY = 'kdramasl_pwa_notif_cache_v1';
const READ_IDS_KEY = 'kdramasl_pwa_read_ids';

interface NotifContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotifContext = createContext<NotifContextType>({
  notifications: [], unreadCount: 0, loading: true,
  markAsRead: () => {}, markAllAsRead: () => {},
});

export function useNotifications() { return useContext(NotifContext); }

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveReadIds(ids: Set<string>) {
  try { localStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids])); } catch {}
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { settings, loading: settingsLoading, notFound: settingsNotFound } = useAppSettings();
  const [raw, setRaw] = useState<Omit<AppNotification, 'read'>[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const hasContent = useRef(false);
  const cachedSavedAtRef = useRef(-1);

  const notifications: AppNotification[] = raw.map((n) => ({ ...n, read: readIds.has(n.id) }));
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const ids = loadReadIds();
    setReadIds(ids);

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.notifications) && parsed.notifications.length > 0) {
          cachedSavedAtRef.current = parsed.savedAt ?? 0;
          setRaw(parsed.notifications.map((n: any) => ({ ...n, createdAt: new Date(n.createdAt) })));
          setLoading(false);
          hasContent.current = true;
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (settingsLoading) return;
    if (settingsNotFound || !settings) {
      if (!hasContent.current) setLoading(false);
      return;
    }

    const notificationsUpdatedAt = Number(settings.notificationsUpdatedAt ?? 0);
    if (notificationsUpdatedAt <= cachedSavedAtRef.current) {
      if (!hasContent.current) setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((d) => {
          const dd = d.data();
          return {
            id: d.id,
            title: dd.title ?? '',
            body: dd.body ?? '',
            imageUrl: dd.imageUrl,
            data: dd.data ?? {},
            createdAt: dd.createdAt?.toDate?.() ?? new Date(),
          };
        });
        setRaw(data);
        setLoading(false);
        hasContent.current = true;
        cachedSavedAtRef.current = notificationsUpdatedAt;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ notifications: data, savedAt: notificationsUpdatedAt }));
      } catch (e) {
        console.error('[Notifications] fetch error', e);
        if (!hasContent.current) setLoading(false);
      }
    };

    fetchNotifications();
  }, [settings, settingsLoading, settingsNotFound]);

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev).add(id);
      saveReadIds(next);
      return next;
    });
  };

  const markAllAsRead = () => {
    setReadIds((prev) => {
      const next = new Set([...prev, ...raw.map((n) => n.id)]);
      saveReadIds(next);
      return next;
    });
  };

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, loading, markAsRead, markAllAsRead }}>
      {children}
    </NotifContext.Provider>
  );
}
