"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/core/utils/cn";
import type { CustomDomainPhase } from "@/features/institutions/lib/custom-domain";
import { isCustomDomainPhasePending } from "@/features/institutions/lib/custom-domain";

/** Visual treatment for the current custom-domain lifecycle phase. Lives in
 * its own file because the badge is rendered in two places (the card header
 * and the status alert) and they should always agree on color and label. */
export function PhaseBadge({ phase }: { phase: CustomDomainPhase }) {
  const cfg = phaseBadge(phase);
  const Icon = phase === "https-ready" ? CheckCircle2 : null;
  const isPending = isCustomDomainPhasePending(phase);

  return (
    <Badge variant="outline" className={cn("w-fit gap-1.5", cfg.className)}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {isPending && !Icon ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : null}
      {cfg.label}
    </Badge>
  );
}

function phaseBadge(phase: CustomDomainPhase): {
  label: string;
  className: string;
} {
  switch (phase) {
    case "https-ready":
      return {
        label: "HTTPS ready",
        className:
          "border-green-600/30 bg-green-500/15 text-green-700 dark:text-green-400",
      };
    case "provisioning":
      return {
        label: "Provisioning HTTPS…",
        className:
          "border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-300",
      };
    case "manual-attach":
      return {
        label: "DNS verified — awaiting HTTPS",
        className:
          "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
      };
    case "awaiting-dns":
      return {
        label: "Awaiting DNS verification",
        className:
          "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
      };
    case "error":
      return {
        label: "Needs attention",
        className: "border-destructive/40 bg-destructive/10 text-destructive",
      };
    default:
      return {
        label: "Not configured",
        className: "border-border bg-muted/50 text-muted-foreground",
      };
  }
}
