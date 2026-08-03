import { CheckCircle2, Gavel } from "lucide-react";
import Link from "next/link";

interface StageManagerLiveMetricsProps {
  reportingHref: string;
  judgementHref: string;
  reportingStartedCount: number;
  judgementStartedCount: number;
}

export function StageManagerLiveMetrics({
  reportingHref,
  judgementHref,
  reportingStartedCount,
  judgementStartedCount,
}: StageManagerLiveMetricsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link
        href={reportingHref}
        className="group flex items-center gap-4 rounded-2xl border border-border/80 bg-card px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-md"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold leading-none tracking-tight text-foreground">
            {reportingStartedCount}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse" />
            Reporting in progress
          </p>
        </div>
      </Link>

      <Link
        href={judgementHref}
        className="group flex items-center gap-4 rounded-2xl border border-border/80 bg-card px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Gavel className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold leading-none tracking-tight text-foreground">
            {judgementStartedCount}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(99,102,241,0.5)] animate-pulse" />
            Judgement in progress
          </p>
        </div>
      </Link>
    </div>
  );
}
