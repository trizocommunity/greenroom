import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // No service worker outside production builds — avoids stale caches while
  // iterating in development.
  disable: process.env.NODE_ENV !== "production",
  // Precache the offline fallback page so the service worker can serve it
  // when a navigation fails while offline (wired up in src/app/sw.ts).
  additionalPrecacheEntries: [
    {
      url: "/offline",
      // Next.js renders this page identically on every build, so a static
      // revision is fine; bump it if the offline page design changes.
      revision: "1",
    },
  ],
});

const nextConfig: NextConfig = {
  allowedDevOrigins: ["ahlussuffa.test", "*.ahlussuffa.test"],
  async headers() {
    return [
      {
        // The service worker must never be cached by the browser/CDN,
        // otherwise updates to sw.js would not roll out.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/:slug/on-event-works/:path*",
        destination: "/dashboard/:slug/event-works/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "cloudinary.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
  serverExternalPackages: ["pg", "ioredis"],
};

export default withSerwist(nextConfig);
