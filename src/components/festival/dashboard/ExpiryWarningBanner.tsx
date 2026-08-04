"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/core/datetime";

interface ExpiryWarningBannerProps {
  daysRemaining: number;
  expiresAtIso: string;
  festivalName: string;
}

/**
 * Dismissible in-app banner mounted above the dashboard header at T-7
 * (see SPEC §1.7). The dismissal is stored in localStorage so the
 * banner doesn't nag the user on every page navigation within the
 * warning window. The cron-driven email + lifecycle event remain the
 * durable channel.
 */
export function ExpiryWarningBanner({
  daysRemaining,
  expiresAtIso,
  festivalName,
}: ExpiryWarningBannerProps) {
  const storageKey = `expiry-banner-dismissed:${expiresAtIso}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey) === "1");
    } catch {
      // localStorage unavailable — show the banner anyway.
    }
  }, [storageKey]);

  if (dismissed) return null;

  const expiryDate = (() => {
    try {
      return formatDate(expiresAtIso, { style: "medium" });
    } catch {
      return expiresAtIso;
    }
  })();

  return (
    <output
      aria-live="polite"
      className="mb-4 flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-warning-foreground"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <div className="flex-1 space-y-1 text-sm">
        <p className="font-semibold text-warning">
          {festivalName} expires in {daysRemaining} day
          {daysRemaining === 1 ? "" : "s"}.
        </p>
        <p className="text-warning/80">
          The festival will be archived on {expiryDate}. Download the Manual
          Book from your profile after expiry to keep a copy of your data.
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-warning hover:bg-warning/15"
        onClick={() => {
          try {
            window.localStorage.setItem(storageKey, "1");
          } catch {
            // ignore
          }
          setDismissed(true);
        }}
        aria-label="Dismiss expiry warning"
      >
        <X className="h-4 w-4" />
      </Button>
    </output>
  );
}
