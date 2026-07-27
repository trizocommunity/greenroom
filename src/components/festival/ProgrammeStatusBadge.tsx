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
  ASSIGNED: "border-transparent bg-muted text-muted-foreground",
  SCHEDULED:
    "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
  REPORTING: "border-transparent bg-warning/15 text-warning",
  STARTED: "border-transparent bg-warning/15 text-warning",
  ENDED: "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
  JUDGED: "border-transparent bg-primary/15 text-primary",
  PUBLISHED: "border-transparent bg-success/15 text-success",
  ANNOUNCED: "border-transparent bg-success/15 text-success",
  RESET: "border-transparent bg-destructive/15 text-destructive",
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
