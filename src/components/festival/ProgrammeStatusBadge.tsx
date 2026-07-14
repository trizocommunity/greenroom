"use client";

import { Badge } from "@/components/ui/badge";
import type { ProgrammeStatus } from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";

const STATUS_LABELS: Record<ProgrammeStatus, string> = {
  READY: "Ready",
  ASSIGNED: "Assigned",
  SCHEDULED: "Scheduled",
  REPORTING: "Reporting",
  STARTED: "Started",
  ENDED: "Ended",
  JUDGED: "Judged",
  PUBLISHED: "Published",
  ANNOUNCED: "Announced",
  RESET: "Reset",
};

/**
 * Programme status color system (semantic, theme-aware):
 * - READY: muted (not started)
 * - ASSIGNED: slate/neutral (in progress)
 * - SCHEDULED: primary (confirmed)
 * - REPORTING / STARTED: amber (active / event day)
 * - ENDED: muted (phase complete)
 * - JUDGED: primary (results in)
 * - PUBLISHED: success green (final, live)
 */
const STATUS_STYLES: Record<ProgrammeStatus, string> = {
  READY: "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
  ASSIGNED:
    "border-transparent bg-slate-500/15 text-slate-700 dark:text-slate-300 dark:bg-slate-500/20",
  SCHEDULED:
    "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
  REPORTING:
    "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300 dark:bg-amber-500/20",
  STARTED:
    "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300 dark:bg-amber-500/20",
  ENDED: "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
  JUDGED: "border-transparent bg-primary/15 text-primary dark:bg-primary/20",
  PUBLISHED:
    "border-transparent bg-green-500/15 text-green-700 dark:text-green-400 dark:bg-green-500/20",
  ANNOUNCED:
    "border-transparent bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 dark:bg-emerald-500/20",
  RESET:
    "border-transparent bg-red-500/15 text-red-700 dark:text-red-400 dark:bg-red-500/20",
};

interface ProgrammeStatusBadgeProps {
  status: ProgrammeStatus;
  className?: string;
}

export function ProgrammeStatusBadge({
  status,
  className,
}: ProgrammeStatusBadgeProps) {
  const label = STATUS_LABELS[status] ?? status;
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.READY;
  return (
    <Badge variant="outline" className={cn(style, className)}>
      {label}
    </Badge>
  );
}
