"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/core/utils/cn";

export type ScanEntry = {
  id: string;
  ok: boolean;
  duplicate?: boolean;
  title: string;
  detail: string;
  at: number;
};

/**
 * The live response strip under the camera: only the single latest scan
 * result, big and bold. It fully replaces itself on every scan — no log — so
 * the operator sees one clear "did that work?" answer and nothing else. The
 * `key` on the inner row restarts the fade-in each time a new scan lands.
 */
export function ScanResponseFooter({ entries }: { entries: ScanEntry[] }) {
  const latest = entries[0];

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card/70 shadow-sm">
      <div
        key={latest?.id ?? "idle"}
        className={cn(
          "flex animate-in fade-in slide-in-from-bottom-1 items-center gap-3 px-4 py-3 duration-200",
          !latest && "bg-muted/30",
          latest?.ok && !latest?.duplicate && "bg-emerald-500/10",
          latest?.duplicate && "bg-amber-500/10",
          latest && !latest.ok && "bg-destructive/10",
        )}
      >
        <span className="shrink-0">
          {!latest ? (
            <Info className="h-7 w-7 text-muted-foreground" aria-hidden />
          ) : latest.duplicate ? (
            <Info className="h-7 w-7 text-amber-600" aria-hidden />
          ) : latest.ok ? (
            <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden />
          ) : (
            <XCircle className="h-7 w-7 text-destructive" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold leading-tight">
            {latest ? latest.title : "Ready to scan"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {latest ? latest.detail : "Point the camera at a chest-number QR."}
          </p>
        </div>
        {latest ? (
          <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
            {new Date(latest.at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
