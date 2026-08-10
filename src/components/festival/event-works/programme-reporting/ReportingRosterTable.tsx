"use client";

import { Check, Crown, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/core/utils/cn";
import type { RosterTableRow } from "./types";

interface ReportingRosterTableProps {
  rows: RosterTableRow[];
  isInProgress: boolean;
  isClosed: boolean;
  onMark: (row: RosterTableRow, checked: boolean) => Promise<void>;
  markingIds: Set<string>;
  getIssuedCodeForRow: (row: RosterTableRow) => string | null;
  programmeType: "INDIVIDUAL" | "GROUP";
  /** Set once checkout is complete — attendance is frozen for the draw. */
  disabled?: boolean;
}

export function ReportingRosterTable({
  rows,
  isInProgress,
  isClosed,
  onMark,
  markingIds,
  getIssuedCodeForRow,
  programmeType,
  disabled = false,
}: ReportingRosterTableProps) {
  const canMark = isInProgress && !disabled;

  return (
    <div className="rounded-xl border border-border/70 overflow-hidden bg-card/60">
      {/* Desktop roster (column layout) */}
      <div className="hidden md:block">
        <div className="grid grid-cols-12 border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <div className="col-span-1 flex justify-center">Present</div>
          <div className="col-span-6">
            {programmeType === "GROUP" ? "Team" : "Participant"}
          </div>
          <div className="col-span-2">Group</div>
          <div className="col-span-3 text-right">Code</div>
        </div>
        <div className="divide-y divide-border/40">
          {rows.map((row) => {
            const issuedCode = getIssuedCodeForRow(row);
            const showCode = (isClosed || !!issuedCode) && row.isReported;
            const isMarking = markingIds.has(row.assignmentId);

            return (
              <div
                key={row.key}
                className={cn(
                  "grid grid-cols-12 items-center px-3 py-2.5 text-sm transition-colors",
                  row.isReported ? "bg-success/[0.06]" : "hover:bg-muted/30",
                )}
              >
                <div className="col-span-1 flex justify-center">
                  {canMark ? (
                    isMarking ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Checkbox
                        checked={row.isReported}
                        onCheckedChange={(checked) => onMark(row, !!checked)}
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                    )
                  ) : (
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        row.isReported
                          ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                          : "bg-muted",
                      )}
                    />
                  )}
                </div>
                <div className="col-span-6 pr-2">
                  <p
                    className={cn(
                      "font-medium truncate",
                      row.isReported
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {row.nameColumn}
                  </p>
                  {row.mode === "team" && row.teamLeadName ? (
                    <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                      <Crown className="h-3 w-3 shrink-0 text-primary" />
                      {row.teamLeadName}
                    </p>
                  ) : null}
                </div>
                <div className="col-span-2 truncate text-muted-foreground text-xs">
                  {row.groupName ?? "—"}
                </div>
                <div className="col-span-3 text-right font-mono text-xs">
                  {showCode ? (
                    <span className="inline-flex items-center rounded-md border border-purple/30 bg-purple/10 px-2 py-0.5 text-purple font-bold">
                      {issuedCode}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile roster (simple card/list) */}
      <div className="md:hidden space-y-px bg-border/40">
        {rows.map((row) => {
          const issuedCode = getIssuedCodeForRow(row);
          const showCode = (isClosed || !!issuedCode) && row.isReported;
          const title = row.nameColumn;
          const subtitle =
            row.mode === "team" && row.teamLeadName
              ? `${row.groupName ?? "—"} · Lead: ${row.teamLeadName}`
              : (row.groupName ?? "—");
          const isMarking = markingIds.has(row.assignmentId);

          return (
            <div
              key={row.key}
              className={cn(
                "bg-background px-3 py-3 flex items-center gap-4 transition-colors",
                row.isReported && "bg-success/[0.06]",
              )}
            >
              {canMark ? (
                <button
                  type="button"
                  disabled={isMarking}
                  onClick={() => onMark(row, !row.isReported)}
                  className={cn(
                    "-my-3 flex min-w-0 flex-1 items-center gap-4 py-3 text-left cursor-pointer",
                    isMarking && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <span className="shrink-0">
                    {isMarking ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      // Decorative only — the whole row is the tap target, and a
                      // real Checkbox here would nest a button inside a button.
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-sm border",
                          row.isReported
                            ? "border-green-600 bg-green-600 text-primary-foreground"
                            : "border-primary",
                        )}
                      >
                        {row.isReported ? <Check className="h-4 w-4" /> : null}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm font-medium",
                        row.isReported
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                      {subtitle}
                    </span>
                  </span>
                </button>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="shrink-0">
                    <div
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        row.isReported ? "bg-green-500" : "bg-muted",
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        row.isReported
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5 uppercase tracking-wide">
                      {subtitle}
                    </p>
                  </div>
                </div>
              )}
              <div className="shrink-0 font-mono text-xs">
                {showCode ? (
                  <span className="inline-flex items-center rounded-md border border-purple/30 bg-purple/10 px-2 py-1 text-purple font-bold">
                    {issuedCode}
                  </span>
                ) : (
                  <span className="text-muted-foreground/30">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
