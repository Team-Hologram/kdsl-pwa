'use client';
// src/context/MediaContext.tsx
// Mirrors RN MediaProvider — surgical Firestore reads, localStorage cache

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { Media } from '@/lib/types';
import { fetchAllMedia, fetchMediaById } from '@/lib/mediaService';
import { useAppSettings } from './AppSettingsContext';

const CACHE_KEY = 'kdramasl_pwa_media_cache_v1';

interface MediaContextType {
  all: Media[];
  trending: Media[];
  latest: Media[];
  loading: boolean;
  getById: (id: string) => Media | undefined;
}

const MediaContext = createContext<MediaContextType>({
  all: [], trending: [], latest: [], loading: true, getById: () => undefined,
});

function deriveTrending(all: Media[]): Media[] {
  return [...all].filter((m) => m.trending).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 20);
}

function deriveLatest(all: Media[]): Media[] {
  return [...all]
    .filter((m) => m.latest)
    .sort((a, b) => {
      const aO = !a.completed ? 0 : 1, bO = !b.completed ? 0 : 1;
      if (aO !== bO) return aO - bO;
      return (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0);
    })
    .slice(0, 20);
}

export function MediaProvider({ children }: { children: ReactNode }) {
  const { settings, loading: settingsLoading, notFound: settingsNotFound, error: settingsError } = useAppSettings();
  const [all, setAll] = useState<Media[]>([]);
  const [trending, setTrending] = useState<Media[]>([]);
  const [latest, setLatest] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const allRef = useRef<Media[]>([]);
  const hasSentInitial = useRef(false);
  const cachedSavedAtRef = useRef(-1);
  const didApplyRef = useRef(false);

  const apply = useCallback((list: Media[], savedAt: number) => {
    allRef.current = list;
    setAll(list);
    setTrending(deriveTrending(list));
    setLatest(deriveLatest(list));
    setLoading(false);
    hasSentInitial.current = true;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ all: list, savedAt }));
    } catch {}
  }, []);

  useEffect(() => {
    const hardTimeout = setTimeout(async () => {
      if (!didApplyRef.current) {
        console.warn('[MediaContext] Firestore timeout — falling back to direct fetch');
        try {
          const list = await fetchAllMedia();
          apply(list, Date.now());
          didApplyRef.current = true;
        } catch (e) {
          console.error('[MediaContext] Direct fetch also failed:', e);
          setLoading(false);
        }
      }
    }, 10_000);

    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.all) && parsed.all.length > 0) {
          cachedSavedAtRef.current = parsed.savedAt ?? 0;
          apply(parsed.all, cachedSavedAtRef.current);
          didApplyRef.current = true;
        }
      }
    } catch (e) {
      console.warn('[MediaContext] Cache read failed:', e);
    }

    return () => {
      clearTimeout(hardTimeout);
    };
  }, [apply]);

  useEffect(() => {
    if (settingsLoading) return;

    if (settingsError || settingsNotFound || !settings) {
      if (!hasSentInitial.current) {
        fetchAllMedia()
          .then((list) => {
            apply(list, Date.now());
            didApplyRef.current = true;
          })
          .catch(() => setLoading(false));
      }
      return;
    }

    const catalogUpdatedAt = Number(settings.catalogUpdatedAt ?? 0);
    const lastChangedMediaId = String(settings.lastChangedMediaId ?? '');
    const lastChangeType = String(settings.lastChangeType ?? 'update');

    if (catalogUpdatedAt <= cachedSavedAtRef.current) {
      if (!hasSentInitial.current) setLoading(false);
      return;
    }

    const syncMedia = async () => {
      try {
        const isFresh = !hasSentInitial.current;
        if (lastChangedMediaId && !isFresh) {
          if (lastChangeType === 'delete') {
            const newAll = allRef.current.filter((m) => m.id !== lastChangedMediaId);
            apply(newAll, catalogUpdatedAt);
          } else {
            const updated = await fetchMediaById(lastChangedMediaId);
            if (updated) {
              const exists = allRef.current.some((m) => m.id === lastChangedMediaId);
              const newAll = exists
                ? allRef.current.map((m) => m.id === lastChangedMediaId ? updated : m)
                : [...allRef.current, updated];
              apply(newAll, catalogUpdatedAt);
            }
          }
        } else {
          const list = await fetchAllMedia();
          apply(list, catalogUpdatedAt);
        }

        didApplyRef.current = true;
        cachedSavedAtRef.current = catalogUpdatedAt;
      } catch (fetchErr) {
        console.error('[MediaContext] Fetch error after settings/app snapshot:', fetchErr);
        if (!hasSentInitial.current) setLoading(false);
      }
    };

    syncMedia();
  }, [settings, settingsError, settingsLoading, settingsNotFound, apply]);

  const getById = useCallback((id: string) => all.find((m) => m.id === id), [all]);

  return (
    <MediaContext.Provider value={{ all, trending, latest, loading, getById }}>
      {children}
    </MediaContext.Provider>
  );
}

export const useMediaContext = () => useContext(MediaContext);
