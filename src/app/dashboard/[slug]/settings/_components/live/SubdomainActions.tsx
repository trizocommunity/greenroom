"use client";

import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** Owner-only connect / disconnect control. We render this as a Switch rather
 * than a Button because the state ("Branded URL is shared" vs "Path URL is
 * shared") is persistent and the toggle should communicate it at a glance. */
export function SubdomainActions({
  isConnected,
  isToggling,
  isReadOnly,
  onToggle,
}: {
  isConnected: boolean;
  isToggling: boolean;
  isReadOnly: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">
          {isConnected
            ? "Custom domain is connected"
            : "Custom domain is paused"}
        </p>
        <p className="text-xs text-muted-foreground">
          {isConnected
            ? "Branded URL is shared. Pause to swap to the path URL without losing setup."
            : "Path URL is shared. Resume to bring the branded URL back."}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Label
          htmlFor="connect-switch"
          className="text-sm text-muted-foreground"
        >
          {isConnected ? "Connected" : "Paused"}
        </Label>
        <div className="relative">
          <Switch
            id="connect-switch"
            checked={isConnected}
            disabled={isToggling || isReadOnly}
            onCheckedChange={(next) => onToggle(next)}
            aria-label="Toggle custom domain connection"
          />
          {isToggling && (
            <span className="absolute -right-7 top-1/2 -translate-y-1/2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
