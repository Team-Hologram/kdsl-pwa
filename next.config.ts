import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.2'],
  // Transpile Firebase packages through SWC so static class blocks and
  // other ES2022+ syntax get compiled down for iOS 15 Safari compatibility
  transpilePackages: [
    'firebase',
    '@firebase/app',
    '@firebase/auth',
    '@firebase/firestore',
    '@firebase/messaging',
    '@firebase/installations',
    '@firebase/storage',
    '@firebase/analytics',
    '@firebase/app-check',
    '@firebase/component',
    '@firebase/util',
    '@firebase/logger',
    '@firebase/webchannel-wrapper',
    '@firebase/data-connect',
  ],
  // Images are loaded as normal <img> tags from the public CDN.
  images: {
    remotePatterns: [],
    unoptimized: true,
  },
  // Headers for PWA / security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
      {
        source: "/firebase-messaging-sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
