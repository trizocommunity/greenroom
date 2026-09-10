"use client";

import { ArrowRight, LifeBuoy } from "lucide-react";
import { cn } from "@/core/utils/cn";

/** Right-rail promo card under the settings nav. Sits in the same column the
 * user already has their eye on, so DNS problems get a single-tap escalation
 * path instead of a support ticket search. */
export function NeedDnsSupportCard({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm",
        "border-amber-500/20 bg-amber-500/5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
          <LifeBuoy className="h-4 w-4" />
        </span>
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-semibold">Need DNS Support?</p>
          <p className="text-xs text-muted-foreground">
            Our domain integration team can help propagate your CNAME setup in
            minutes.
          </p>
          <a
            href="mailto:ops@greenroomfestivals.in?subject=DNS%20setup%20help"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Contact Ops
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </aside>
  );
}
