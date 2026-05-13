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
  const {
    showPermissionPrompt,
    registering,
    requestPermission,
    dismissPermissionPrompt,
  } = useFCM();

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
      {showPermissionPrompt && !isPlayer && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.58)',
              backdropFilter: 'blur(4px)',
              zIndex: 10000,
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-permission-title"
            style={{
              position: 'fixed',
              left: 16,
              right: 16,
              bottom: 'calc(var(--bottom-nav-height) + 16px)',
              zIndex: 10001,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(0,217,255,0.12)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 id="notification-permission-title" style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                  Allow notifications?
                </h2>
                <p style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
                  Get new episode alerts and KDrama SL updates on this iPhone.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={dismissPermissionPrompt}
                disabled={registering}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Not now
              </button>
              <button
                onClick={requestPermission}
                disabled={registering}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  background: 'var(--primary)',
                  color: '#0A0E27',
                  fontSize: 14,
                  fontWeight: 800,
                  opacity: registering ? 0.7 : 1,
                }}
              >
                {registering ? 'Saving...' : 'Allow'}
              </button>
            </div>
          </div>
        </>
      )}
      {!isPlayer && <BottomNav />}
    </>
  );
}
