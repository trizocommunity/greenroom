"use client";

import { ChevronRight, Crown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { AppEmptyState, StatusPill } from "@/components/app/AppSection";
import { ProgrammeStatusBadge } from "@/components/festival/ProgrammeStatusBadge";
import { ReportingEndsInCountdown } from "@/components/programme/ReportingEndsInCountdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/core/utils/cn";

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
  teamLeadByKey = {},
}: {
  items: ProgrammeCardData[];
  categoryOptions: { id: string; name: string }[];
  /** `${programmeId}:${teamNumber}` -> team lead name, for this group. */
  teamLeadByKey?: Record<string, string>;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [openProgrammeId, setOpenProgrammeId] = useState<string | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 15;

  useEffect(() => {
    setPageIndex(0);
  }, [selectedCategoryId]);

  const visibleItems = useMemo(() => {
    return items.filter(
      (p) =>
        selectedCategoryId === "all" || p.category.id === selectedCategoryId,
    );
  }, [items, selectedCategoryId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={selectedCategoryId}
          onValueChange={setSelectedCategoryId}
        >
          <SelectTrigger className="h-9 w-full rounded-full sm:w-[220px]">
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

        <p className="text-xs tabular-nums text-muted-foreground">
          {visibleItems.length} of {items.length}
        </p>
      </div>

      {visibleItems.length === 0 ? (
        <AppEmptyState
          title="No programmes match"
          description="Try a different category."
        />
      ) : (
        <>
          <ul className="border-y border-border">
            {visibleItems
              .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
              .map((p) => (
              <ProgrammeRow
                key={p.programmeId}
                p={p}
                onOpen={() => setOpenProgrammeId(p.programmeId)}
              />
            ))}
          </ul>
          
          {visibleItems.length > pageSize && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    
                    onClick={(e) => {
                      e.preventDefault();
                      if (pageIndex > 0) setPageIndex(p => p - 1);
                    }}
                    className={pageIndex === 0 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>

                {[...Array(Math.ceil(visibleItems.length / pageSize))].map((_, i) => {
                  const targetPage = i;
                  const totalPages = Math.ceil(visibleItems.length / pageSize);
                  
                  if (
                    targetPage === 0 ||
                    targetPage === totalPages - 1 ||
                    (targetPage >= pageIndex - 1 && targetPage <= pageIndex + 1)
                  ) {
                    return (
                      <PaginationItem key={i}>
                        <PaginationLink
                          
                          isActive={pageIndex === targetPage}
                          onClick={(e) => {
                            e.preventDefault();
                            setPageIndex(targetPage);
                          }}
                        >
                          {targetPage + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  
                  if (targetPage === pageIndex - 2 || targetPage === pageIndex + 2) {
                    return (
                      <PaginationItem key={i}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    
                    onClick={(e) => {
                      e.preventDefault();
                      if ((pageIndex + 1) * pageSize < visibleItems.length) setPageIndex(p => p + 1);
                    }}
                    className={(pageIndex + 1) * pageSize >= visibleItems.length ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <ProgrammeDetailsDrawer
        p={items.find((i) => i.programmeId === openProgrammeId) ?? null}
        teamLeadByKey={teamLeadByKey}
        onOpenChange={(open) => !open && setOpenProgrammeId(null)}
      />
    </div>
  );
}

/** Left-edge tint on theme tokens — the old literals were unreadable in dark mode. */
function rowAccentClass(highlight: ProgrammeCardData["reportingHighlight"]) {
  if (highlight === "live") return "border-l-success bg-success/[0.04]";
  if (highlight === "closed") return "border-l-info bg-info/[0.04]";
  if (highlight === "reset") return "border-l-warning bg-warning/[0.04]";
  return "border-l-transparent";
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

function memberReportingChipLabel(
  note: string | null | undefined,
  programmeType: string,
): string | null {
  if (!note) return null;
  if (isReportingCodeChipNote(note)) {
    return formatReportingChipNote(note, programmeType);
  }
  return note;
}

function ProgrammeRow({
  p,
  onOpen,
}: {
  p: ProgrammeCardData;
  onOpen: () => void;
}) {
  const isFullyAssigned =
    p.expectedAssignments > 0 && p.assignedCount >= p.expectedAssignments;

  return (
    <li
      className={cn(
        "border-b border-l-2 border-border last:border-b-0",
        rowAccentClass(p.reportingHighlight),
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-center gap-4 px-4 py-4 text-left transition-opacity hover:opacity-80"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-medium text-heading">
              {p.name}
            </span>
            <ProgrammeStatusBadge status={p.status} />
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {p.category?.name ?? "Uncategorised"} ·{" "}
            {p.type === "GROUP" ? "Team" : "Individual"}
          </p>
        </div>

        <div className="hidden shrink-0 flex-wrap items-center gap-1.5 sm:flex">
          {p.reportingHighlight === "live" && (
            <StatusPill tone="live" pulse>
              Live
            </StatusPill>
          )}
          {p.reportingHighlight === "reset" && (
            <StatusPill tone="warning">Reset</StatusPill>
          )}
          {/* Group-scoped: how many of *your* participants are in. */}
          <StatusPill tone={isFullyAssigned ? "ready" : "muted"}>
            {p.expectedAssignments > 0
              ? `${p.assignedCount}/${p.expectedAssignments} assigned`
              : `${p.assignedCount} assigned`}
          </StatusPill>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </button>
    </li>
  );
}

/**
 * Everything about one programme, including who leads each of your teams.
 * This used to be an inline `<details>` on every row, which made the board
 * unscannable once a few were expanded.
 */
function ProgrammeDetailsDrawer({
  p,
  teamLeadByKey,
  onOpenChange,
}: {
  p: ProgrammeCardData | null;
  teamLeadByKey: Record<string, string>;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={Boolean(p)} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-lg"
      >
        {p && (
          <>
            <SheetHeader className="space-y-0 border-b border-border p-5 text-left">
              <div className="flex items-start gap-2">
                <SheetTitle className="min-w-0 flex-1 text-lg font-semibold tracking-tight text-heading">
                  {p.name}
                </SheetTitle>
                <ProgrammeStatusBadge status={p.status} />
              </div>
              <SheetDescription className="text-xs">
                {p.category?.name ?? "Uncategorised"} ·{" "}
                {p.type === "GROUP" ? "Team programme" : "Individual programme"}
              </SheetDescription>

              <div className="flex flex-wrap items-center gap-1.5 pt-3">
                {p.reportingHighlight === "live" && (
                  <>
                    <StatusPill tone="live" pulse>
                      Live reporting
                    </StatusPill>
                    {p.reportingWindowEndsAt && (
                      <ReportingEndsInCountdown
                        endsAt={p.reportingWindowEndsAt}
                        autoRefreshOnExpire
                      />
                    )}
                  </>
                )}
                {p.reportingHighlight === "closed" && (
                  <StatusPill tone="muted">
                    Reporting ended
                    {p.sessionCodeLetter
                      ? ` · ${p.type === "GROUP" ? "Team code" : "Code"} ${p.sessionCodeLetter}`
                      : ""}
                  </StatusPill>
                )}
                {p.reportingHighlight === "reset" && (
                  <StatusPill tone="warning">Reporting reset</StatusPill>
                )}
                {p.teamReportingCounts && (
                  <StatusPill>
                    {p.teamReportingCounts.reported}/
                    {p.teamReportingCounts.total} reported
                  </StatusPill>
                )}
                <StatusPill tone="muted">
                  {p.assignedCount} from your group
                </StatusPill>
              </div>
            </SheetHeader>

            <div className="space-y-6 p-5">
              {p.type === "GROUP" ? (
                p.myGroupTeams.length > 0 ? (
                  p.myGroupTeams.map((t) => {
                    const teamCode = extractTeamCodeFromMembers(t.members);
                    const lead =
                      teamLeadByKey[`${p.programmeId}:${t.teamNumber}`];

                    return (
                      <div key={`${t.groupId}-${t.teamNumber}`}>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {t.groupName} — Team {t.teamNumber}
                          </h3>
                          {teamCode && (
                            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-heading">
                              {teamCode}
                            </span>
                          )}
                        </div>

                        {lead && (
                          <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Crown className="h-3 w-3 text-primary" />
                            Team lead:{" "}
                            <span className="font-medium text-heading">
                              {lead}
                            </span>
                          </p>
                        )}

                        <MemberList
                          members={t.members}
                          programmeType={p.type}
                        />
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">
                    None of your participants are in this programme.
                  </p>
                )
              ) : p.myIndividualMembers.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Your participants
                  </h3>
                  <MemberList
                    members={p.myIndividualMembers}
                    programmeType="INDIVIDUAL"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  None of your participants are in this programme.
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MemberList({
  members,
  programmeType,
}: {
  members: MemberChip[];
  programmeType: string;
}) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {members.map((m) => {
        const label = memberReportingChipLabel(m.reportingNote, programmeType);
        const isCode = m.reportingNote
          ? isReportingCodeChipNote(m.reportingNote)
          : false;

        return (
          <li
            key={m.assignmentId ?? m.id}
            className="flex items-center gap-3 py-2.5"
          >
            <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
              {m.chestNumber ?? "—"}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-heading">
              {m.name}
            </span>
            {label && (
              <span
                className={cn(
                  "shrink-0 text-[11px]",
                  isCode
                    ? "font-mono font-semibold text-primary"
                    : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
