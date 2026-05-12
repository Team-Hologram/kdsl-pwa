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
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        // Only lock down the proxy routes — prevents leaking real B2/R2 URLs
        source: "/api/proxy/:path*",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/api/download",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
  // Silence the "critical dependency" warning from archiver on the server side
  serverExternalPackages: ["archiver"],
};

export default nextConfig;
