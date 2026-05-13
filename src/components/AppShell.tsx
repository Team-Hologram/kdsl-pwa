'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';
import { useFCM } from '@/hooks/useFCM';
import { useLocalUser } from '@/hooks/useLocalUser';
import { ErrorBoundary } from './ErrorBoundary';

const PLAYER_PATHS = ['/player'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { theme } = useLocalUser();
  const pathname = usePathname();
  useFCM();

  // Apply theme to html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const isPlayer = PLAYER_PATHS.some((p) => pathname.startsWith(p));

  return (
    <>
      <main style={{ paddingBottom: isPlayer ? 0 : undefined }}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      {!isPlayer && <BottomNav />}
    </>
  );
}
