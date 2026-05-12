// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { MediaProvider } from '@/context/MediaContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'KDrama SL',
  description: 'Korean Dramas & Movies with Sinhala & English Subtitles – stream and download for free',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KDrama SL',
    startupImage: [
      { url: '/splash/splash-1290x2796.png', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/splash-1179x2556.png', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/splash-1170x2532.png', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/splash-1125x2436.png', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/splash-828x1792.png',  media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)' },
      { url: '/splash/splash-750x1334.png',  media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' },
      { url: '/splash/splash-640x1136.png',  media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)' },
    ],
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
  themeColor: '#0A0E27',
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
        {/* Disable phone number detection */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>
        <MediaProvider>
          <NotificationsProvider>
            <AppShell>{children}</AppShell>
          </NotificationsProvider>
        </MediaProvider>
      </body>
    </html>
  );
}
