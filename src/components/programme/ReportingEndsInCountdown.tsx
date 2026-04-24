"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/core/utils/cn";
import { formatCountdownHms } from "@/core/utils/format-countdown";

type Props = {
  endsAt: string | Date | null | undefined;
  className?: string;
  /** Smaller inline style without outer badge padding variant differences */
  variant?: "badge" | "inline";
  /** Refreshes server-rendered status once countdown reaches zero. */
  autoRefreshOnExpire?: boolean;
};

export function ReportingEndsInCountdown({
  endsAt,
  className,
  variant = "badge",
  autoRefreshOnExpire = false,
}: Props) {
  const router = useRouter();
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

  const remaining =
    endMs == null ? 0 : Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
  void tick;
  const isExpired = remaining <= 0;

  useEffect(() => {
    if (endMs == null) return;
    if (!autoRefreshOnExpire) return;
    if (!isExpired) return;
    router.refresh();
  }, [autoRefreshOnExpire, endMs, isExpired, router]);

  if (endMs == null) return null;

  if (isExpired) return null;

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
