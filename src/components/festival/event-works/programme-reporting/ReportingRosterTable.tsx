"use client";

import { Loader2 } from "lucide-react";
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
}

export function ReportingRosterTable({
  rows,
  isInProgress,
  isClosed,
  onMark,
  markingIds,
  getIssuedCodeForRow,
  programmeType,
}: ReportingRosterTableProps) {
  return (
    <div className="rounded-md border overflow-hidden">
      {/* Desktop roster (column layout) */}
      <div className="hidden md:block">
        <div className="grid grid-cols-12 border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <div className="col-span-1 flex justify-center">Status</div>
          <div className="col-span-6">
            {programmeType === "GROUP" ? "Team / members" : "Student"}
          </div>
          <div className="col-span-2">Group</div>
          <div className="col-span-3 text-right">Code letter</div>
        </div>
        <div className="divide-y divide-border/40">
          {rows.map((row) => {
            const issuedCode = getIssuedCodeForRow(row);
            const showCode = isClosed && issuedCode && row.isReported;
            const isMarking =
              row.mode === "individual"
                ? markingIds.has(row.assignmentId)
                : row.assignmentIds.some((id) => markingIds.has(id));

            return (
              <div
                key={row.key}
                className={cn(
                  "grid grid-cols-12 items-center px-3 py-2.5 text-sm transition-colors",
                  row.isReported ? "bg-green-500/[0.02]" : "hover:bg-muted/30",
                )}
              >
                <div className="col-span-1 flex justify-center">
                  {isInProgress ? (
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
                </div>
                <div className="col-span-2 truncate text-muted-foreground text-xs">
                  {row.groupName ?? "—"}
                </div>
                <div className="col-span-3 text-right font-mono text-xs">
                  {showCode ? (
                    <span className="inline-flex items-center rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-blue-700 dark:text-blue-300 font-bold">
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
          const showCode = isClosed && issuedCode && row.isReported;
          const title =
            row.mode === "groupTeam" ? `Team ${row.teamCell}` : row.nameColumn;
          const subtitle =
            row.mode === "groupTeam"
              ? `${row.groupName ?? "—"} · Team ${row.teamCell}`
              : (row.groupName ?? "—");
          const isMarking =
            row.mode === "individual"
              ? markingIds.has(row.assignmentId)
              : row.assignmentIds.some((id) => markingIds.has(id));

          return (
            <div
              key={row.key}
              className={cn(
                "bg-background px-3 py-3 flex items-center gap-4 transition-colors",
                row.isReported && "bg-green-500/[0.01]",
              )}
            >
              <div className="shrink-0">
                {isInProgress ? (
                  isMarking ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Checkbox
                      checked={row.isReported}
                      onCheckedChange={(checked) => onMark(row, !!checked)}
                      className="h-5 w-5 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                  )
                ) : (
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      row.isReported ? "bg-green-500" : "bg-muted",
                    )}
                  />
                )}
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
              {isClosed && (
                <div className="shrink-0 font-mono text-xs">
                  {showCode ? (
                    <span className="inline-flex items-center rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-blue-700 dark:text-blue-300 font-bold">
                      {issuedCode}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/30">—</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
