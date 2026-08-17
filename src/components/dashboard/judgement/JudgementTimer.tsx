"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/core/utils/cn";
import { formatElapsedMinutes } from "./judgement-time";

/**
 * Live elapsed-time pill for an in-progress judgement.
 *
 * The timer ticks once per second so the rendered label can stay rounded to a
 * whole minute — the second-hand is invisible at this scale and would flicker.
 * When `startedAt` is missing the pill collapses so the card never shows a
 * misleading "0m".
 */
export function JudgementTimer({
  startedAt,
  className,
  size = "sm",
}: {
  startedAt: string | Date | null;
  className?: string;
  size?: "sm" | "xs";
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const startMs =
      startedAt instanceof Date ? startedAt.getTime() : Date.parse(startedAt);
    if (!Number.isFinite(startMs)) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) return null;

  const startMs =
    startedAt instanceof Date ? startedAt.getTime() : Date.parse(startedAt);
  if (!Number.isFinite(startMs)) return null;

  const label = formatElapsedMinutes(startMs, now);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-purple/40 bg-purple/10 font-mono font-semibold text-purple tabular-nums",
        size === "xs"
          ? "h-5 px-1.5 text-[10px]"
          : "h-6 px-2 text-[11px] sm:text-xs",
        className,
      )}
      title="Time since judgement started"
    >
      <Clock
        className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"}
        aria-hidden
      />
      {label}
    </span>
  );
}
