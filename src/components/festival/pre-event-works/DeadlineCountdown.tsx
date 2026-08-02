"use client";

import { useEffect, useState } from "react";

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
    <span className={`tabular-nums ${className ?? ""}`}>
      {formatCountdown(parts)}
    </span>
  );
}

/** Big segmented countdown used by the blocked-section panel. */
export function DeadlineCountdownBlocks({ target }: { target: Date | null }) {
  const parts = useCountdown(target);
  if (!target) return null;

  const segments = [
    { label: "days", value: parts.days },
    { label: "hours", value: parts.hours },
    { label: "mins", value: parts.minutes },
    { label: "secs", value: parts.seconds },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {segments.map((segment) => (
        <div
          key={segment.label}
          className="min-w-[64px] rounded-xl border border-border bg-background/70 px-3 py-2 text-center"
        >
          <p className="text-xl font-semibold tabular-nums text-heading sm:text-2xl">
            {String(segment.value).padStart(2, "0")}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {segment.label}
          </p>
        </div>
      ))}
    </div>
  );
}
