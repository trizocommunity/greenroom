"use client";

import { useEffect, useState } from "react";
import { cn } from "@/core/utils/cn";

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

function partsUntil(target: Date | null): CountdownParts {
  const totalMs = Math.max(0, (target?.getTime() ?? 0) - Date.now());
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
  };
}

/** Ticks once a second until `target`, then stops at zero. */
export function useCountdown(target: Date | null): CountdownParts {
  const [parts, setParts] = useState<CountdownParts>(() => partsUntil(target));

  useEffect(() => {
    setParts(partsUntil(target));
    if (!target) return;

    const interval = window.setInterval(() => {
      const next = partsUntil(target);
      setParts(next);
      if (next.totalMs <= 0) window.clearInterval(interval);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [target]);

  return parts;
}

/** "2d 04h 12m 09s" — drops the day segment once it's under a day. */
export function formatCountdown(parts: CountdownParts): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (parts.days > 0) {
    return `${parts.days}d ${pad(parts.hours)}h ${pad(parts.minutes)}m`;
  }
  return `${pad(parts.hours)}h ${pad(parts.minutes)}m ${pad(parts.seconds)}s`;
}

/** Inline live countdown. Renders nothing once there's no target left. */
export function DeadlineCountdown({
  target,
  className,
}: {
  target: Date | null;
  className?: string;
}) {
  const parts = useCountdown(target);
  if (!target) return null;
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>
      {formatCountdown(parts)}
    </span>
  );
}

/**
 * Prominent countdown for the blocked-section panel. Card-less on purpose:
 * one unbroken line of digits reads faster than four boxed tiles, and it
 * survives a 320px viewport without wrapping.
 */
export function DeadlineCountdownLarge({
  target,
  className,
}: {
  target: Date | null;
  className?: string;
}) {
  const parts = useCountdown(target);
  if (!target) return null;

  const segments = [
    { label: "d", value: parts.days },
    { label: "h", value: parts.hours },
    { label: "m", value: parts.minutes },
    { label: "s", value: parts.seconds },
  ];

  return (
    <p
      className={cn(
        "flex items-baseline justify-center gap-x-1 font-semibold tabular-nums tracking-tight text-heading",
        "text-[clamp(1.5rem,9vw,2.25rem)]",
        className,
      )}
    >
      <span className="sr-only">{formatCountdown(parts)} remaining</span>
      {segments.map((segment) => (
        <span
          key={segment.label}
          aria-hidden
          className="inline-flex items-baseline"
        >
          {String(segment.value).padStart(2, "0")}
          <span className="ml-px text-[0.45em] font-medium uppercase text-muted-foreground">
            {segment.label}
          </span>
        </span>
      ))}
    </p>
  );
}
