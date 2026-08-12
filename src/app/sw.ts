/// <reference lib="webworker" />
import { defaultCache, PAGES_CACHE_NAME } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist, Strategy } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injected by @serwist/next at build time — the precache manifest of the
    // app shell (JS/CSS chunks, self-hosted fonts, static assets).
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Scope: installable app shell only. Authenticated dashboards must never be
// served stale, so we drop the default rules that cache page navigations,
// RSC payloads, API responses and other dynamic documents. Static assets
// (fonts, images, JS, CSS) keep their default runtime caching.
const DYNAMIC_CACHE_NAMES = new Set<string>([
  PAGES_CACHE_NAME.rscPrefetch,
  PAGES_CACHE_NAME.rsc,
  PAGES_CACHE_NAME.html,
  "apis",
  "next-data",
  "others",
  "cross-origin",
]);

const runtimeCaching = [
  {
    // Same-origin document navigations always go to the network. When the
    // network fails (offline), the fallback plugin serves the precached
    // /offline page instead of a browser error.
    matcher: ({
      request,
      sameOrigin,
    }: {
      request: Request;
      sameOrigin: boolean;
    }) => sameOrigin && request.mode === "navigate",
    handler: new NetworkOnly(),
  },
  ...defaultCache.filter((entry) => {
    const handler = entry.handler;
    if (!(handler instanceof Strategy)) return true;
    return !DYNAMIC_CACHE_NAMES.has(handler.cacheName);
  }),
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  // When a document navigation fails (e.g. offline), serve the precached
  // /offline page. Authenticated routes are never precached, so they always
  // land here — not on stale HTML — when offline.
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
