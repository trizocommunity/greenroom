"use client";

import { CheckCircle2, Eye, Loader2, Power, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils/cn";

import type { LaunchPhase } from "./types";

/** Hero card answering the user's most anxious question first: "is my site
 * live?". On desktop the headline + actions sit on a single row; on mobile the
 * actions wrap to their own row but the headline stays prominent. */
export function StatusHeroCard({
  isLive,
  phase,
  hasSsl,
  isReadOnly,
  previewReady,
  onPreview,
  onTakeOffline,
  onLaunch,
}: {
  isLive: boolean;
  phase: LaunchPhase;
  /** True once the festival has a verified custom domain, or the path URL
   * resolves to HTTPS. The "SSL Active" badge hides when this is false so
   * owners aren't reassured by a stale claim. */
  hasSsl: boolean;
  isReadOnly: boolean;
  previewReady: boolean;
  onPreview: () => void;
  onTakeOffline: () => void;
  onLaunch: () => void;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm",
        isLive && "border-green-600/25",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5",
          isLive ? "bg-green-500/5" : "bg-muted/30",
        )}
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            isLive
              ? "bg-green-500/15 text-green-700 dark:text-green-400"
              : "bg-primary/10 text-primary",
          )}
        >
          {isLive ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Rocket className="h-5 w-5" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold sm:text-base">
              {isLive ? "Your festival site is Live" : "Ready to go live?"}
            </p>
            {isLive && hasSsl && (
              <Badge
                variant="outline"
                className="border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-400"
              >
                SSL Active
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {isLive
              ? "Share the link below with schools, judges, and attendees. You can safely unpublish or put into maintenance mode anytime."
              : "Turn on the public site instantly — no domain setup needed."}
          </p>
        </div>

        {isLive ? (
          <div className="flex w-full shrink-0 gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 flex-1 sm:flex-none"
              onClick={onPreview}
              disabled={!previewReady}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Preview
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 flex-1 text-destructive hover:text-destructive sm:flex-none"
              onClick={onTakeOffline}
              disabled={phase === "taking-offline" || isReadOnly}
            >
              {phase === "taking-offline" ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Power className="h-3.5 w-3.5 mr-1.5" />
              )}
              {phase === "taking-offline" ? "Stopping…" : "Take offline"}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-9 w-full shrink-0 sm:w-auto"
            onClick={onLaunch}
            disabled={isReadOnly}
          >
            <Rocket className="h-3.5 w-3.5 mr-1.5" />
            Launch website
          </Button>
        )}
      </div>
    </section>
  );
}
