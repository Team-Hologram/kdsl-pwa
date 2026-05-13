'use client';

import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type AppSettings = Record<string, unknown>;

interface AppSettingsContextType {
  settings: AppSettings | null;
  loading: boolean;
  notFound: boolean;
  error: Error | null;
}

const AppSettingsContext = createContext<AppSettingsContextType>({
  settings: null,
  loading: true,
  notFound: false,
  error: null,
});

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<AppSettingsContextType>({
    settings: null,
    loading: true,
    notFound: false,
    error: null,
  });

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'app'),
      (snap) => {
        if (!snap.exists()) {
          setValue({ settings: null, loading: false, notFound: true, error: null });
          return;
        }

        setValue({ settings: snap.data(), loading: false, notFound: false, error: null });
      },
      (error) => {
        console.error('[AppSettings] settings/app listener error:', error);
        setValue({ settings: null, loading: false, notFound: false, error });
      }
    );

    return () => unsub();
  }, []);

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
