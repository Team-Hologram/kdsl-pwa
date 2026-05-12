'use client';
// src/hooks/useLocalUser.ts
// localStorage-based favorites, watchlist, theme (mirrors RN AuthContext guest mode)

import { useState, useEffect, useCallback } from 'react';

interface LocalUser {
  favorites: string[];
  watchlist: string[];
  theme: 'dark' | 'light';
}

const KEY = 'kdramasl_pwa_user';

function load(): LocalUser {
  if (typeof window === 'undefined') return { favorites: [], watchlist: [], theme: 'dark' };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { favorites: [], watchlist: [], theme: 'dark', ...JSON.parse(raw) };
  } catch {}
  return { favorites: [], watchlist: [], theme: 'dark' };
}

function save(u: LocalUser) {
  try { localStorage.setItem(KEY, JSON.stringify(u)); } catch {}
}

export function useLocalUser() {
  const [user, setUser] = useState<LocalUser>(() => load());

  // Sync theme class on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', user.theme);
  }, [user.theme]);

  const updateUser = useCallback((patch: Partial<LocalUser>) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setUser((prev) => {
      const next: LocalUser = { ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' };
      save(next);
      return next;
    });
  }, []);

  const addFavorite = useCallback((id: string) => {
    setUser((prev) => {
      if (prev.favorites.includes(id)) return prev;
      const next = { ...prev, favorites: [...prev.favorites, id] };
      save(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setUser((prev) => {
      const next = { ...prev, favorites: prev.favorites.filter((x) => x !== id) };
      save(next);
      return next;
    });
  }, []);

  const addWatchlist = useCallback((id: string) => {
    setUser((prev) => {
      if (prev.watchlist.includes(id)) return prev;
      const next = { ...prev, watchlist: [...prev.watchlist, id] };
      save(next);
      return next;
    });
  }, []);

  const removeWatchlist = useCallback((id: string) => {
    setUser((prev) => {
      const next = { ...prev, watchlist: prev.watchlist.filter((x) => x !== id) };
      save(next);
      return next;
    });
  }, []);

  const isFavorite = (id: string) => user.favorites.includes(id);
  const isInWatchlist = (id: string) => user.watchlist.includes(id);

  return {
    user,
    theme: user.theme,
    toggleTheme,
    addFavorite,
    removeFavorite,
    addWatchlist,
    removeWatchlist,
    isFavorite,
    isInWatchlist,
  };
}
