"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatCountdownHms } from "@/lib/format-countdown-hms";
import { cn } from "@/lib/utils";

type Props = {
  endsAt: string | Date | null | undefined;
  className?: string;
  /** Smaller inline style without outer badge padding variant differences */
  variant?: "badge" | "inline";
};

export function ReportingEndsInCountdown({
  endsAt,
  className,
  variant = "badge",
}: Props) {
  const [tick, setTick] = useState(0);

  const endMs = useMemo(() => {
    if (endsAt == null) return null;
    const t =
      typeof endsAt === "string"
        ? new Date(endsAt).getTime()
        : endsAt.getTime();
    return Number.isNaN(t) ? null : t;
  }, [endsAt]);

  useEffect(() => {
    if (endMs == null) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [endMs]);

  if (endMs == null) return null;

  const remaining = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
  void tick;

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
          className,
        )}
      >
        <span className="font-sans">Ends in</span>
        <span className="font-mono tabular-nums">
          {formatCountdownHms(remaining)}
        </span>
      </span>
    );
  }

  return (
    <Badge variant="secondary" className={cn("gap-1.5 text-xs", className)}>
      <span className="font-sans font-normal text-muted-foreground">
        Ends in
      </span>
      <span className="font-mono tabular-nums">
        {formatCountdownHms(remaining)}
      </span>
    </Badge>
  );
}
