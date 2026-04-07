"use client";

import { Radio } from "lucide-react";
import { useMemo, useState } from "react";
import { ProgrammeStatusBadge } from "@/components/festival/ProgrammeStatusBadge";
import { ReportingEndsInCountdown } from "@/components/programme/ReportingEndsInCountdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MemberChip = {
  id: string;
  name: string;
  chestNumber?: string | null;
  assignmentId?: string;
  reportingNote?: string | null;
};

type GroupTeam = {
  groupId: string;
  groupName: string;
  teamNumber: number;
  members: MemberChip[];
};

export type ProgrammeCardData = {
  programmeId: string;
  name: string;
  status: any;
  type: "GROUP" | "INDIVIDUAL" | string;
  category: { id: string; name: string; type: string | null };
  groupIds: string[];
  myParticipantCount: number;
  reportingHighlight: "live" | "closed" | "reset" | null;
  /** ISO string when live session has a window end */
  reportingWindowEndsAt: string | null;
  sessionCodeLetter: string | null;
  teamReportingCounts: {
    reported: number;
    pending: number;
    total: number;
  } | null;
  assignedCount: number;
  expectedAssignments: number;
  myGroupTeams: GroupTeam[];
  myIndividualMembers: MemberChip[];
};

export function AllProgrammesClient({
  items,
  categoryOptions,
}: {
  items: ProgrammeCardData[];
  categoryOptions: { id: string; name: string }[];
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  const visibleItems = useMemo(() => {
    return items.filter((p) => {
      return (
        selectedCategoryId === "all" || p.category.id === selectedCategoryId
      );
    });
  }, [items, selectedCategoryId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={selectedCategoryId}
          onValueChange={setSelectedCategoryId}
        >
          <SelectTrigger className="h-10 w-full sm:w-[220px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visibleItems.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No programmes match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleItems.map((p) => (
            <ProgrammeCard key={p.programmeId} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function programmeCardBorderClass(
  highlight: ProgrammeCardData["reportingHighlight"],
) {
  if (highlight === "live") return "border-emerald-500/40 bg-emerald-500/5";
  if (highlight === "closed") return "border-blue-500/35 bg-blue-500/5";
  if (highlight === "reset") return "border-amber-500/40 bg-amber-500/10";
  return "";
}

function isReportingCodeChipNote(note: string): boolean {
  return note.startsWith("Code ") || note.startsWith("Team code ");
}

/** Group: prefer “Team code A”; legacy “Code A” becomes “Team code A”. Individual: letter only after “Code ”. */
function formatReportingChipNote(note: string, programmeType: string): string {
  if (note.startsWith("Team code ")) return note;
  if (note.startsWith("Code ")) {
    const letter = note.replace(/^Code /, "");
    return programmeType === "GROUP" ? `Team code ${letter}` : letter;
  }
  return note;
}

function extractTeamCodeFromMembers(members: MemberChip[]): string | null {
  for (const m of members) {
    const note = m.reportingNote ?? "";
    if (note.startsWith("Team code ")) {
      return note.replace("Team code ", "").trim() || null;
    }
    if (note.startsWith("Code ")) {
      return note.replace("Code ", "").trim() || null;
    }
  }
  return null;
}

function normalizeMemberReportingLabel(
  note: string | null | undefined,
): string | null {
  if (!note) return null;
  if (note.startsWith("Team code ") || note.startsWith("Code ")) {
    return "Reported";
  }
  return note;
}

function ProgrammeCard({ p }: { p: ProgrammeCardData }) {
  return (
    <Card className={programmeCardBorderClass(p.reportingHighlight)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="truncate">{p.name}</span>
          <div className="flex items-center gap-3 flex-wrap sm:justify-end">
            {p.reportingHighlight === "live" ? (
              <>
                <Badge className="bg-emerald-600 text-white gap-1">
                  <Radio className="h-3 w-3" />
                  Live reporting
                </Badge>
                {p.reportingWindowEndsAt ? (
                  <ReportingEndsInCountdown
                    endsAt={p.reportingWindowEndsAt}
                    autoRefreshOnExpire
                  />
                ) : null}
              </>
            ) : null}
            {p.reportingHighlight === "closed" ? (
              <Badge className="bg-blue-600 text-white gap-1">
                Reporting ended
                {p.sessionCodeLetter ? (
                  <span className="font-mono font-normal">
                    ·{" "}
                    {p.type === "GROUP"
                      ? `Team code ${p.sessionCodeLetter}`
                      : p.sessionCodeLetter}
                  </span>
                ) : null}
              </Badge>
            ) : null}
            {p.reportingHighlight === "reset" ? (
              <Badge className="bg-amber-600 text-white">
                Reporting closed
              </Badge>
            ) : null}
            {p.teamReportingCounts ? (
              <Badge variant="outline" className="text-xs font-normal">
                Team: {p.teamReportingCounts.reported}/
                {p.teamReportingCounts.total} reported
                {p.teamReportingCounts.pending > 0
                  ? ` · ${p.teamReportingCounts.pending} pending`
                  : ""}
              </Badge>
            ) : null}
            <Badge variant="secondary" className="text-xs bg-muted/40">
              {p.myParticipantCount} participant
              {p.myParticipantCount === 1 ? "" : "s"}
            </Badge>
            <Badge
              variant={
                p.assignedCount >= p.expectedAssignments
                  ? "secondary"
                  : "outline"
              }
              className="text-xs"
            >
              {p.expectedAssignments > 0
                ? p.assignedCount >= p.expectedAssignments
                  ? "Fully assigned"
                  : `Assigned: ${p.assignedCount}/${p.expectedAssignments}`
                : `Assigned: ${p.assignedCount}`}
            </Badge>
            <ProgrammeStatusBadge status={p.status} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">
        Category: {p.category?.name ?? "—"} · Type: {p.type}
        <div className="mt-3">
          <details className="group">
            <summary className="cursor-pointer select-none text-sm text-foreground/90 hover:text-foreground">
              Your team & reporting
            </summary>
            <div className="mt-2 text-xs text-muted-foreground space-y-3">
              {p.type === "GROUP" ? (
                p.myGroupTeams.length > 0 ? (
                  p.myGroupTeams.map((t) => (
                    <div key={`${t.groupId}-${t.teamNumber}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-foreground">
                          {t.groupName} – Team {t.teamNumber}
                        </div>
                        {extractTeamCodeFromMembers(t.members) ? (
                          <span className="rounded border border-blue-500/35 bg-blue-500/10 px-1.5 py-0.5 font-mono text-[11px] text-blue-900 dark:text-blue-100">
                            Team code {extractTeamCodeFromMembers(t.members)}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {t.members.map((m) => (
                          <span
                            key={m.assignmentId ?? m.id}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 bg-muted/30"
                          >
                            <span>{m.name}</span>
                            {m.chestNumber ? (
                              <span className="text-muted-foreground font-mono text-[11px]">
                                {m.chestNumber}
                              </span>
                            ) : null}
                            {m.reportingNote ? (
                              <span
                                className={
                                  isReportingCodeChipNote(m.reportingNote)
                                    ? "ml-1 text-[11px] text-muted-foreground"
                                    : "ml-1 text-[11px] text-muted-foreground"
                                }
                              >
                                {normalizeMemberReportingLabel(m.reportingNote)}
                              </span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div>No participants from your team in this programme.</div>
                )
              ) : (
                <div>
                  {p.myIndividualMembers.length > 0 ? (
                    <div className="space-y-2">
                      <div className="font-medium text-foreground">
                        Individual participants
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {p.myIndividualMembers.map((m) => (
                          <span
                            key={m.assignmentId ?? m.id}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 bg-muted/30"
                          >
                            <span>{m.name}</span>
                            {m.chestNumber ? (
                              <span className="text-muted-foreground font-mono text-[11px]">
                                {m.chestNumber}
                              </span>
                            ) : null}
                            {m.reportingNote ? (
                              <span
                                className={
                                  isReportingCodeChipNote(m.reportingNote)
                                    ? "ml-1 rounded border border-blue-500/35 bg-blue-500/10 px-1 font-mono text-[11px] text-blue-900 dark:text-blue-100"
                                    : "ml-1 text-[11px] text-muted-foreground"
                                }
                              >
                                {formatReportingChipNote(
                                  m.reportingNote,
                                  "INDIVIDUAL",
                                )}
                              </span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>No participants from your team in this programme.</div>
                  )}
                </div>
              )}
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
