// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { MediaProvider } from '@/context/MediaContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import { AppSettingsProvider } from '@/context/AppSettingsContext';
import AppShell from '@/components/AppShell';
import MonetagRouteGuard from '@/components/MonetagRouteGuard';

const iosStartupImages = [
  { url: '/splash/splash-1320x2868.png', media: '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)' },
  { url: '/splash/splash-1290x2796.png', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)' },
  { url: '/splash/splash-1284x2778.png', media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)' },
  { url: '/splash/splash-1206x2622.png', media: '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)' },
  { url: '/splash/splash-1179x2556.png', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)' },
  { url: '/splash/splash-1170x2532.png', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)' },
  { url: '/splash/splash-1125x2436.png', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)' },
  { url: '/splash/splash-1242x2688.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)' },
  { url: '/splash/splash-828x1792.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)' },
  { url: '/splash/splash-1242x2208.png', media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)' },
  { url: '/splash/splash-750x1334.png', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' },
  { url: '/splash/splash-640x1136.png', media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)' },
  { url: '/splash/splash-2048x2732.png', media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)' },
  { url: '/splash/splash-1668x2388.png', media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)' },
  { url: '/splash/splash-1668x2224.png', media: '(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)' },
  { url: '/splash/splash-1536x2048.png', media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)' },
];

export const metadata: Metadata = {
  title: 'KDrama SL',
  description: 'Korean Dramas & Movies with Sinhala & English Subtitles – stream and download for free',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KDrama SL',
    startupImage: iosStartupImages,
  },
  icons: {
    apple: '/icons/icon-180.png',
    icon: '/icons/icon-192.png',
  },
  openGraph: {
    title: 'KDrama SL',
    description: 'Korean Dramas & Movies with Sinhala Subtitles',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#131829',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        {/* ── Polyfills for React 19 on older iOS Safari ──────────────────── */}
        <script dangerouslySetInnerHTML={{ __html: `
          // Promise.withResolvers — required by React 19, only in Safari 17.4+
          if (!Promise.withResolvers) {
            Promise.withResolvers = function() {
              var rs, rj;
              var p = new Promise(function(res, rej) { rs = res; rj = rej; });
              return { promise: p, resolve: rs, reject: rj };
            };
          }
          // structuredClone — required by React 19, only in Safari 15.4+
          if (!window.structuredClone) {
            window.structuredClone = function(obj) {
              return JSON.parse(JSON.stringify(obj));
            };
          }
          // Array.prototype.toSorted — only in Safari 16+
          if (!Array.prototype.toSorted) {
            Array.prototype.toSorted = function(fn) { return [...this].sort(fn); };
          }
          // Array.prototype.toReversed — only in Safari 16+
          if (!Array.prototype.toReversed) {
            Array.prototype.toReversed = function() { return [...this].reverse(); };
          }
        `}} />
        {/* iOS PWA full-screen */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        {iosStartupImages.map((image) => (
          <link key={image.url} rel="apple-touch-startup-image" href={image.url} media={image.media} />
        ))}
        <meta name="monetag" content="22864a604781ea94182620567edbe0f1"></meta>
        {/* Disable phone number detection */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>
        {/* Portrait-lock overlay — hidden in portrait, shown in landscape via CSS */}
        <div
          className="portrait-lock-overlay"
          style={{
            display: 'none',
            position: 'fixed', inset: 0, zIndex: 99999,
            background: '#0A0E27',
            flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
          }}
        >
          <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#00D9FF" strokeWidth={1.5}>
            <rect x="4" y="2" width="16" height="20" rx="2"/>
            <path d="M12 18h.01"/>
          </svg>
          <p style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Please rotate to portrait</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>This app works in portrait mode only</p>
        </div>
        <AppSettingsProvider>
          <MediaProvider>
            <NotificationsProvider>
              <MonetagRouteGuard />
              <AppShell>{children}</AppShell>
            </NotificationsProvider>
          </MediaProvider>
        </AppSettingsProvider>
      </body>
    </html>
  );
}
