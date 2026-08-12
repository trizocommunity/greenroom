"use client";

import { WifiOff } from "lucide-react";

// Offline fallback page used by the Serwist service worker when a navigation
// request fails while the device is offline (see fallbacks in next.config.ts).
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <WifiOff className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-heading">
          You&apos;re offline
        </h1>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          It looks like you&apos;ve lost your internet connection. Greenroom
          needs a connection to load fresh data. Check your network and try
          again.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        Try again
      </button>
    </div>
  );
}
