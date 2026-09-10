"use client";

import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Sticky header strip at the top of the Launch Website tab. Title and live
 * pulse-dot on the left, "View Live Portal" affordance on the right. The live
 * badge is suppressed while the site is offline so the affordance is never
 * contradictory. */
export function PageHeader({
  isLive,
  publicUrl,
}: {
  isLive: boolean;
  publicUrl: string;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Launch Website
        </h1>
        {isLive ? (
          <Badge
            variant="outline"
            className="gap-1.5 border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-400"
          >
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </Badge>
        ) : (
          <Badge variant="secondary">Offline</Badge>
        )}
      </div>

      <Button
        asChild={isLive}
        variant="outline"
        size="sm"
        className="h-9"
        disabled={!isLive}
        title={
          isLive
            ? "Open the live festival site in a new tab"
            : "Launch the site first"
        }
      >
        {isLive ? (
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            <Eye className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">View Live Portal</span>
          </a>
        ) : (
          <>
            <Eye className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">View Live Portal</span>
          </>
        )}
      </Button>
    </header>
  );
}
