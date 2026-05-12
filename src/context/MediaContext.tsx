'use client';
// src/context/MediaContext.tsx
// Mirrors RN MediaProvider — surgical Firestore reads, localStorage cache

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { Media } from '@/lib/types';
import { fetchAllMedia, fetchMediaById, subscribeToSettingsApp } from '@/lib/mediaService';

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
  const [all, setAll] = useState<Media[]>([]);
  const [trending, setTrending] = useState<Media[]>([]);
  const [latest, setLatest] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const allRef = useRef<Media[]>([]);
  const hasSentInitial = useRef(false);

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
    let unsub: (() => void) | null = null;
    let cachedSavedAt = -1;
    let didApply = false;

    // Hard-timeout: if Firestore never responds in 10s, fall back to direct full fetch
    const hardTimeout = setTimeout(async () => {
      if (!didApply) {
        console.warn('[MediaContext] Firestore timeout — falling back to direct fetch');
        try {
          const list = await fetchAllMedia();
          apply(list, Date.now());
          didApply = true;
        } catch (e) {
          console.error('[MediaContext] Direct fetch also failed:', e);
          setLoading(false);
        }
      }
    }, 10_000);

    const init = async () => {
      // 1. Show localStorage cache instantly (0 network reads)
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.all) && parsed.all.length > 0) {
            cachedSavedAt = parsed.savedAt ?? 0;
            apply(parsed.all, cachedSavedAt);
            didApply = true;
            console.log(`[MediaContext] Cache shown: ${parsed.all.length} items`);
          }
        }
      } catch (e) {
        console.warn('[MediaContext] Cache read failed:', e);
      }

      // 2. Subscribe to settings/app for surgical updates
      try {
        unsub = subscribeToSettingsApp(
          async (data) => {
            const catalogUpdatedAt: number = data?.catalogUpdatedAt ?? 0;
            const lastChangedMediaId: string = data?.lastChangedMediaId ?? '';
            const lastChangeType: string = data?.lastChangeType ?? 'update';

            console.log(`[MediaContext] settings/app snapshot — catalogUpdatedAt=${catalogUpdatedAt}, cachedSavedAt=${cachedSavedAt}`);

            if (catalogUpdatedAt <= cachedSavedAt) {
              if (!hasSentInitial.current) setLoading(false);
              return;
            }

            try {
              const isFresh = !hasSentInitial.current;
              if (lastChangedMediaId && !isFresh) {
                // Surgical: fetch just 1 doc
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
                // Full fetch (first load or no specific ID)
                console.log('[MediaContext] Full media fetch...');
                const list = await fetchAllMedia();
                console.log(`[MediaContext] Fetched ${list.length} items`);
                apply(list, catalogUpdatedAt);
              }
              didApply = true;
            } catch (fetchErr) {
              console.error('[MediaContext] Fetch error after settings/app snapshot:', fetchErr);
              if (!hasSentInitial.current) setLoading(false);
            }

            cachedSavedAt = catalogUpdatedAt;
          },
          (err) => {
            // settings/app listener error — try direct full fetch as fallback
            console.error('[MediaContext] settings/app listener error:', err);
            if (!hasSentInitial.current) {
              fetchAllMedia()
                .then((list) => { apply(list, Date.now()); didApply = true; })
                .catch(() => setLoading(false));
            }
          },
          // onNotFound: settings/app doc doesn't exist — full fetch directly
          () => {
            console.warn('[MediaContext] settings/app not found — doing full fetch');
            if (!hasSentInitial.current) {
              fetchAllMedia()
                .then((list) => { apply(list, Date.now()); didApply = true; })
                .catch(() => setLoading(false));
            }
          }
        );
      } catch (e) {
        console.error('[MediaContext] subscribeToSettingsApp failed:', e);
        // If subscription itself throws, do a plain full fetch
        try {
          const list = await fetchAllMedia();
          apply(list, Date.now());
          didApply = true;
        } catch { setLoading(false); }
      }
    };

    init();
    return () => {
      clearTimeout(hardTimeout);
      unsub?.();
    };
  }, [apply]);

  const getById = useCallback((id: string) => all.find((m) => m.id === id), [all]);

  return (
    <MediaContext.Provider value={{ all, trending, latest, loading, getById }}>
      {children}
    </MediaContext.Provider>
  );
}

export const useMediaContext = () => useContext(MediaContext);
