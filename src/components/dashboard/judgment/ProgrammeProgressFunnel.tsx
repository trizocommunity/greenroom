import { cn } from "@/core/utils/cn";

/**
 * Compact funnel showing where a programme stands:
 * Assigned → Reported → Absent → Scored → Pending.
 * `scored` is optional (the reporting screen doesn't know judgment progress).
 */
export function ProgrammeProgressFunnel({
  assigned,
  reported,
  absent,
  scored,
  className,
}: {
  assigned: number;
  reported: number;
  absent: number;
  scored?: number;
  className?: string;
}) {
  const active = Math.max(0, reported - absent);
  const hasScored = typeof scored === "number";
  const pending = hasScored ? Math.max(0, active - (scored ?? 0)) : null;

  const stats: Array<{ label: string; value: number; tone: string }> = [
    { label: "Assigned", value: assigned, tone: "text-foreground" },
    { label: "Reported", value: reported, tone: "text-foreground" },
    { label: "Absent", value: absent, tone: "text-amber-600 dark:text-amber-400" },
  ];
  if (hasScored) {
    stats.push({
      label: "Scored",
      value: scored ?? 0,
      tone: "text-emerald-600 dark:text-emerald-400",
    });
    stats.push({
      label: "Pending",
      value: pending ?? 0,
      tone:
        (pending ?? 0) > 0
          ? "text-orange-600 dark:text-orange-400"
          : "text-muted-foreground",
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-stretch gap-1.5 text-center",
        className,
      )}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="flex items-center gap-1.5"
        >
          <div className="rounded-md border bg-muted/20 px-2 py-1">
            <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p className={cn("text-sm font-bold tabular-nums", s.tone)}>
              {s.value}
            </p>
          </div>
          {i < stats.length - 1 ? (
            <span className="text-muted-foreground/40" aria-hidden>
              ›
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
