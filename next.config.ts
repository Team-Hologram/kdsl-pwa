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
  // Allow images from external domains via the proxy, but keep origins server-side
  images: {
    remotePatterns: [],
    unoptimized: true, // we proxy images ourselves
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
        // Lock down streaming proxy routes — prevents leaking real B2/R2 URLs.
        // Image proxy has its own cacheable headers below.
        source: "/api/proxy/:path(video|subtitle)",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/api/proxy/image",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
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
