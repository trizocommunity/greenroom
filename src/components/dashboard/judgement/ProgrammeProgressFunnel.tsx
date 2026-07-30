import { cn } from "@/core/utils/cn";

/**
 * Compact funnel showing where a programme stands:
 * Assigned → Reported → Absent → Scored → Pending.
 * `scored` is optional (the reporting screen doesn't know judgement progress).
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

  const stats: Array<{
    label: string;
    value: number;
    dot: string;
    valueTone: string;
  }> = [
    {
      label: "Assigned",
      value: assigned,
      dot: "bg-blue-500",
      valueTone: "text-foreground",
    },
    {
      label: "Reported",
      value: reported,
      dot: "bg-emerald-500",
      valueTone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Absent",
      value: absent,
      dot: "bg-amber-500",
      valueTone: absent > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
    },
  ];
  if (hasScored) {
    stats.push({
      label: "Scored",
      value: scored ?? 0,
      dot: "bg-purple",
      valueTone: "text-purple",
    });
    stats.push({
      label: "Pending",
      value: pending ?? 0,
      dot: "bg-orange-500",
      valueTone:
        (pending ?? 0) > 0
          ? "text-orange-600 dark:text-orange-400"
          : "text-muted-foreground",
    });
  }

  /* Progress bar: reported / assigned */
  const pct = assigned > 0 ? Math.round((reported / assigned) * 100) : 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* progress bar */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
          {pct}%
        </span>
      </div>

      {/* stats row */}
      <div className="flex items-center gap-3 flex-wrap">
        {stats.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className="text-muted-foreground/30 mr-1.5" aria-hidden>
                ·
              </span>
            )}
            <span className={cn("h-2 w-2 shrink-0 rounded-full", s.dot)} />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {s.label}
            </span>
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                s.valueTone,
              )}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
