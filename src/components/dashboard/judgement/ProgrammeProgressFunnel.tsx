import { cn } from "@/core/utils/cn";

/**
 * Compact funnel showing where a programme stands with individual mini progress bars:
 * Assigned, Reported, Absent.
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
  const hasScored = typeof scored === "number";
  const active = Math.max(0, reported - absent);
  const pending = hasScored ? Math.max(0, active - (scored ?? 0)) : null;

  const bars: Array<{
    label: string;
    value: number;
    max: number;
    color: string;
    bg: string;
  }> = [
    {
      label: "Assigned",
      value: assigned,
      max: assigned,
      color: "bg-blue-500",
      bg: "bg-blue-500/15",
    },
    {
      label: "Reported",
      value: reported,
      max: assigned,
      color: "bg-emerald-500",
      bg: "bg-emerald-500/15",
    },
    {
      label: "Absent",
      value: absent,
      max: assigned,
      color: "bg-amber-500",
      bg: "bg-amber-500/15",
    },
  ];

  if (hasScored) {
    bars.push({
      label: "Scored",
      value: scored ?? 0,
      max: active || 1,
      color: "bg-purple",
      bg: "bg-purple/15",
    });
    if (pending !== null && pending > 0) {
      bars.push({
        label: "Pending",
        value: pending,
        max: active || 1,
        color: "bg-orange-500",
        bg: "bg-orange-500/15",
      });
    }
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {bars.map((b) => {
        const pct = b.max > 0 ? Math.round((b.value / b.max) * 100) : 0;
        return (
          <div key={b.label} className="flex-1 min-w-0 space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground truncate">
              {b.label}
            </p>
            <div
              className={cn("h-1.5 w-full rounded-full overflow-hidden", b.bg)}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  b.color,
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
