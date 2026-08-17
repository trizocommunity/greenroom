import { Crown } from "lucide-react";
import { cn } from "@/core/utils/cn";

export type ReportedEntry = {
  key: string;
  name: string;
  code: string;
  /** GROUP-only: the appointed lead for this team, when there is one. */
  teamLeadName?: string | null;
};

type ReportedEntriesPanelProps = {
  entries: ReportedEntry[];
  className?: string;
};

/**
 * A-Z sorted panel of reported participants, used by both the live drawing
 * surface (`ScratchGrid`) and the fullscreen countdown drawer
 * (`LargeTimerDrawer`). Both call sites pre-compute their entries via
 * `reportedEntriesFromScratchTiles` / `reportedEntriesFromReportedRows` in
 * `reporting-status.ts`; this component is purely presentational.
 */
export function ReportedEntriesPanel({
  entries,
  className,
}: ReportedEntriesPanelProps) {
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  return (
    <div className={cn("mt-6", className)}>
      <h3 className="mb-2 text-[10px] font-semibold tracking-tight uppercase text-muted-foreground">
        Reported Participants (A-Z)
      </h3>
      <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
        {sorted.map((entry) => {
          const code = entry.code && entry.code !== "—" ? entry.code : "—";
          return (
            <div
              key={entry.key}
              className="flex items-center justify-between gap-2 rounded-sm bg-muted/30 px-2 py-1.5 text-xs"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{entry.name}</span>
                {entry.teamLeadName ? (
                  <span className="mt-0.5 flex items-center gap-1 truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                    <Crown className="h-2.5 w-2.5 shrink-0 text-primary" />
                    {entry.teamLeadName}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "font-bold tabular-nums shrink-0",
                  code !== "—" ? "text-primary" : "text-muted-foreground",
                )}
              >
                {code}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
