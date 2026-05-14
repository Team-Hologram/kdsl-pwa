// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import Image from 'next/image';
import './globals.css';
import { MediaProvider } from '@/context/MediaContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import { AppSettingsProvider } from '@/context/AppSettingsContext';
import AppShell from '@/components/AppShell';
import MonetagRouteGuard from '@/components/MonetagRouteGuard';
import PwaInstallGate from '@/components/PwaInstallGate';

const appUrl = 'https://live.kdramasl.site';

const iosStartupImages = [
  { url: '/splash/splash-1320x2868.png', media: 'screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-1290x2796.png', media: 'screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-1284x2778.png', media: 'screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-1206x2622.png', media: 'screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-1179x2556.png', media: 'screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-1170x2532.png', media: 'screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-1125x2436.png', media: 'screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-1242x2688.png', media: 'screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-828x1792.png', media: 'screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
  { url: '/splash/splash-1242x2208.png', media: 'screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
  { url: '/splash/splash-750x1334.png', media: 'screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
  { url: '/splash/splash-640x1136.png', media: 'screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
  { url: '/splash/splash-2048x2732.png', media: 'screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
  { url: '/splash/splash-1668x2388.png', media: 'screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
  { url: '/splash/splash-1668x2224.png', media: 'screen and (device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
  { url: '/splash/splash-1536x2048.png', media: 'screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
];

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'KDrama SL',
  description: 'Korean Dramas & Movies with Sinhala & English Subtitles – stream and download for free',
  manifest: '/manifest.json',
  alternates: {
    canonical: appUrl,
  },
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
    url: appUrl,
    siteName: 'KDrama SL',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'KDrama SL' }],
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
        <script dangerouslySetInnerHTML={{
          __html: `
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="KDrama SL" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        <link rel="apple-touch-startup-image" href="/splash/splash-1170x2532.png" />
        <link rel="preconnect" href="https://n6wxm.com" />
        <link rel="dns-prefetch" href="https://n6wxm.com" />
        {iosStartupImages.map((image) => (
          <link key={image.url} rel="apple-touch-startup-image" href={image.url} media={image.media} />
        ))}
        <meta name="monetag" content="22864a604781ea94182620567edbe0f1"></meta>
        {/* Disable phone number detection */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>
        {/* Portrait-lock overlay: hidden in portrait, shown on mobile landscape via CSS. */}
        <div className="portrait-lock-overlay" role="status" aria-live="polite">
          <div className="portrait-lock-visual" aria-hidden="true">
            <Image
              className="portrait-lock-image"
              src="/orientation/landscape-auto-rotation.jpg"
              alt=""
              width={800}
              height={800}
              priority
            />
            <span className="portrait-lock-arrow">→</span>
            <Image
              className="portrait-lock-image"
              src="/orientation/portrait-rotation-target.jpg"
              alt=""
              width={800}
              height={800}
              priority
            />
          </div>
          <p className="portrait-lock-title">Please On Portrait Orientation Lock</p>
        </div>
        <PwaInstallGate>
          <AppSettingsProvider>
            <MediaProvider>
              <NotificationsProvider>
                <MonetagRouteGuard />
                <AppShell>{children}</AppShell>
              </NotificationsProvider>
            </MediaProvider>
          </AppSettingsProvider>
        </PwaInstallGate>
      </body>
    </html>
  );
}
