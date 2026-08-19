"use client";

import { Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFestival } from "@/components/festival/FestivalContext";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Tier } from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";
import { getResolvedTier } from "@/features/plan-features/services/tier";
import {
  getParticipantLeaderboardView,
  isResultVisibleForLeaderboard,
} from "@/features/results/services/leaderboard-visibility.service";
import { useLiveChannel } from "@/hooks/use-live-channel";

function assignmentOf(r: any) {
  return r.programmeAssignment ?? r.assignment;
}

function resultPointsOf(r: any): number {
  return (r?.awardPoints ?? r?.points ?? 0) as number;
}

const RANK_STYLES = [
  {
    ring: "ring-amber-400/60",
    bg: "bg-gradient-to-br from-amber-400 to-yellow-500",
    text: "text-amber-950",
    row: "bg-amber-500/10 hover:bg-amber-500/15 cursor-pointer",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  },
  {
    ring: "ring-slate-300/60",
    bg: "bg-gradient-to-br from-slate-300 to-slate-400",
    text: "text-slate-900",
    row: "bg-slate-400/10 hover:bg-slate-400/15 cursor-pointer",
    badge:
      "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  },
  {
    ring: "ring-orange-400/60",
    bg: "bg-gradient-to-br from-orange-400 to-amber-600",
    text: "text-orange-950",
    row: "bg-orange-500/10 hover:bg-orange-500/15 cursor-pointer",
    badge:
      "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
  },
] as const;

function RankBadge({ rank }: { rank: number }) {
  const style = RANK_STYLES[rank - 1];
  if (style) {
    return (
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black shadow-sm ring-2",
          style.bg,
          style.text,
          style.ring,
        )}
      >
        {rank}
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
      {rank}
    </span>
  );
}

interface LeaderboardClientProps {
  festival: {
    id: string;
    name: string;
    slug: string;
    accentColor?: string | null;
  };
  results: any[];
  publishedStandings?: any[];
  categories?: { id: string; name: string; type?: string }[];
  groups?: { id: string; name: string }[];
  defaultParticipantFilterCategory?: string;
  defaultParticipantFilterGroup?: string;
  hideParticipantFilters?: boolean;
  readOnly?: boolean;
  hideLiveStandings?: boolean;
  festivalRole?: string;
  tier?: Tier | string | null;
  children?: React.ReactNode;
}

type ParticipantRow = {
  participantId: string;
  rank: number;
  name: string;
  gender: string | null;
  groupName: string | null;
  groupColor: string | null;
  categoryName: string | null;
  offstage: number;
  stage: number;
  points: number;
  programmes: {
    id: string;
    name: string;
    type: string;
    stageType: string;
    points: number;
  }[];
};

export function LeaderboardClient({
  festival,
  results,
  publishedStandings = [],
  categories = [],
  groups = [],
  defaultParticipantFilterCategory,
  defaultParticipantFilterGroup,
  hideParticipantFilters = false,
  tier: tierProp,
  children,
}: LeaderboardClientProps) {
  const router = useRouter();
  const [participantFilterCategory, setParticipantFilterCategory] =
    useState<string>(defaultParticipantFilterCategory ?? "all");
  const [participantFilterGroup, setParticipantFilterGroup] = useState<string>(
    defaultParticipantFilterGroup ?? "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] =
    useState<ParticipantRow | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 15;

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, participantFilterCategory, participantFilterGroup]);

  const festivalContext = useFestival();
  const tier = getResolvedTier(tierProp ?? festivalContext.tier);

  // Top participants by points (individual programmes only).
  const participantStandings = useMemo(() => {
    const byParticipant: Record<string, Omit<ParticipantRow, "rank">> = {};

    const participantView = getParticipantLeaderboardView(tier);

    results.forEach((r) => {
      const a = assignmentOf(r);
      if (
        !isResultVisibleForLeaderboard(r, tier, participantView) ||
        !a?.participant
      )
        return;
      if (r.programme?.type !== "INDIVIDUAL") return;

      if (
        participantFilterCategory !== "all" &&
        a.participant?.categoryId !== participantFilterCategory
      )
        return;
      if (
        participantFilterGroup !== "all" &&
        a.groupId !== participantFilterGroup
      )
        return;

      const sid = a.participant.id;
      const name = a.participant.name ?? "Unknown";
      const groupName = a.group?.name ?? a.participant?.group?.name ?? null;
      const groupColor = a.group?.color ?? a.participant?.group?.color ?? null;
      const categoryName = a.participant?.category?.name ?? null;

      if (!byParticipant[sid]) {
        byParticipant[sid] = {
          participantId: sid,
          name,
          gender: a.participant.gender ?? null,
          groupName,
          groupColor,
          categoryName,
          offstage: 0,
          stage: 0,
          points: 0,
          programmes: [],
        };
      }

      const p = resultPointsOf(r);
      byParticipant[sid].points += p;
      if (r.programme?.stageType === "NON_STAGE") {
        byParticipant[sid].offstage += p;
      } else {
        byParticipant[sid].stage += p;
      }

      byParticipant[sid].programmes.push({
        id: r.programme?.id ?? "unknown",
        name: r.programme?.name ?? "Unknown Programme",
        type: r.programme?.type ?? "INDIVIDUAL",
        stageType: r.programme?.stageType ?? "STAGE",
        points: p,
      });
    });

    return Object.values(byParticipant)
      .filter((p) => {
        if (!searchQuery) return true;
        return p.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => b.points - a.points)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [
    results,
    tier,
    participantFilterCategory,
    participantFilterGroup,
    searchQuery,
  ]);

  // UC7 — standings channel. Every `announceResult` pushes a delta; the
  //    easiest correct client is to refresh the server loader and let the
  //    board re-derive from the freshly-loaded `results` and
  //    `publishedStandings` props. Auto-reconnect backoff is built in.
  const { data: standingsEvent, status: liveStatus } = useLiveChannel<{
    festivalId: string;
    teamStandings: unknown[] | null;
    lastUpdatedAt: string;
  }>({
    url: `/api/v1/festivals/${festival.id}/standings/stream`,
  });

  useEffect(() => {
    if (!standingsEvent) return;
    router.refresh();
  }, [standingsEvent, router]);

  // Polling fallback. The 15s cadence matches the pre-Issue-48 behaviour;
  //    suppressed when SSE is open so we don't double-refetch.
  useEffect(() => {
    if (liveStatus === "open") return;
    const id = window.setInterval(() => {
      router.refresh();
    }, 15000);
    return () => window.clearInterval(id);
  }, [router, liveStatus]);

  return (
    <div className="space-y-6">
      {children}

      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Top Scorers
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          View event top performers and their total points (only includes
          published results)
        </p>
      </div>

      {!hideParticipantFilters && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search participants..."
              className="h-9 pl-8 w-full bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={participantFilterCategory}
              onValueChange={setParticipantFilterCategory}
            >
              <SelectTrigger className="h-9 text-sm w-[150px] sm:w-[180px] bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories
                  .filter((c) => c.type !== "GENERAL")
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select
              value={participantFilterGroup}
              onValueChange={setParticipantFilterGroup}
            >
              <SelectTrigger className="h-9 text-sm w-[150px] sm:w-[180px] bg-background">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Top Scorers Table */}
      <Card className="p-0 overflow-hidden border">
        {/* Desktop */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-14 text-center font-semibold text-foreground">
                  #
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Participant
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Gender
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Group
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Category
                </TableHead>
                <TableHead className="font-semibold text-foreground text-right w-24">
                  Offstage
                </TableHead>
                <TableHead className="font-semibold text-foreground text-right w-24">
                  Stage
                </TableHead>
                <TableHead className="font-semibold text-foreground text-right w-28">
                  Total Points
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participantStandings.length > 0 ? (
                participantStandings
                  .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
                  .map((row) => (
                    <TableRow
                      key={row.participantId}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 transition-colors",
                        RANK_STYLES[row.rank - 1]?.row,
                      )}
                      onClick={() => setSelectedParticipant(row)}
                    >
                      <TableCell className="text-center">
                        <RankBadge rank={row.rank} />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {row.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.gender
                          ? row.gender.charAt(0).toUpperCase() +
                            row.gender.slice(1).toLowerCase()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {row.groupName ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full shadow-sm"
                              style={{
                                backgroundColor: row.groupColor ?? "#94a3b8",
                              }}
                              aria-hidden
                            />
                            <span className="text-muted-foreground">
                              {row.groupName}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.categoryName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-sky-600 dark:text-sky-400 font-medium">
                          {row.offstage}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-rose-600 dark:text-rose-400 font-medium">
                          {row.stage}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-foreground">
                        {row.points}
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    <Users className="mx-auto h-6 w-6 mb-1.5 text-muted-foreground/30" />
                    No participant results yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile */}
        <div className="md:hidden p-3 space-y-2">
          {participantStandings.length > 0 ? (
            participantStandings
              .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
              .map((row) => (
                <div
                  key={row.participantId}
                  onClick={() => setSelectedParticipant(row)}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors",
                    RANK_STYLES[row.rank - 1]
                      ? cn("border-transparent", RANK_STYLES[row.rank - 1].row)
                      : "border-border/70 bg-background",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <RankBadge rank={row.rank} />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{row.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                          <span>{row.categoryName ?? "—"}</span>
                          <span className="inline-flex items-center gap-1">
                            {row.groupName ? (
                              <>
                                <span
                                  className="h-1.5 w-1.5 rounded-full border border-white/60 shadow-sm"
                                  style={{
                                    backgroundColor:
                                      row.groupColor ?? "#94a3b8",
                                  }}
                                  aria-hidden
                                />
                                <span>{row.groupName}</span>
                              </>
                            ) : (
                              "—"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end pt-0.5 min-w-[70px]">
                    <div className="text-sm font-bold tabular-nums">
                      {row.points}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        pts
                      </span>
                    </div>
                    <div className="text-[10px] flex gap-2 mt-1">
                      <span
                        className="text-sky-600 dark:text-sky-400"
                        title="Offstage Points"
                      >
                        Off: {row.offstage}
                      </span>
                      <span
                        className="text-rose-600 dark:text-rose-400"
                        title="Stage Points"
                      >
                        Stg: {row.stage}
                      </span>
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No participant results yet.
            </p>
          )}
        </div>
      </Card>

      {participantStandings.length > pageSize && (
        <DataTablePagination
          pageIndex={pageIndex}
          pageCount={Math.ceil(participantStandings.length / pageSize)}
          onPageChange={(page) => setPageIndex(page)}
          className="mt-4"
        />
      )}

      {/* Participant Breakdown Drawer */}
      <Drawer
        open={!!selectedParticipant}
        onOpenChange={(open) => !open && setSelectedParticipant(null)}
      >
        <DrawerContent>
          <div className="mx-auto w-full max-w-2xl max-h-[85vh] flex flex-col">
            {selectedParticipant && (
              <>
                <DrawerHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <DrawerTitle className="text-2xl flex items-center gap-3">
                        <RankBadge rank={selectedParticipant.rank} />
                        {selectedParticipant.name}
                      </DrawerTitle>
                      <DrawerDescription className="mt-2 flex items-center gap-2">
                        {selectedParticipant.groupName && (
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span
                              className="h-2 w-2 rounded-full shadow-sm"
                              style={{
                                backgroundColor:
                                  selectedParticipant.groupColor ?? "#94a3b8",
                              }}
                              aria-hidden
                            />
                            {selectedParticipant.groupName}
                          </span>
                        )}
                        <span>&bull;</span>
                        <span>{selectedParticipant.categoryName}</span>
                      </DrawerDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-violet-600 dark:text-violet-400">
                        {selectedParticipant.points}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                        Total Pts
                      </div>
                    </div>
                  </div>
                </DrawerHeader>
                <ScrollArea className="flex-1 py-4">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="rounded-xl border bg-sky-500/5 p-4 text-center">
                      <div className="text-sm font-medium text-sky-600 dark:text-sky-400 mb-1">
                        Offstage
                      </div>
                      <div className="text-2xl font-bold">
                        {selectedParticipant.offstage}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-rose-500/5 p-4 text-center">
                      <div className="text-sm font-medium text-rose-600 dark:text-rose-400 mb-1">
                        Stage
                      </div>
                      <div className="text-2xl font-bold">
                        {selectedParticipant.stage}
                      </div>
                    </div>
                  </div>

                  <h4 className="font-semibold text-lg mb-3">
                    Scoring Breakdown
                  </h4>
                  <div className="border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Programme</TableHead>
                          <TableHead className="w-24">Type</TableHead>
                          <TableHead className="w-20 text-right">
                            Points
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedParticipant.programmes.length > 0 ? (
                          selectedParticipant.programmes.map((prog, i) => (
                            <TableRow key={`${prog.id}-${i}`}>
                              <TableCell className="font-medium">
                                {prog.name}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "font-normal text-[10px]",
                                    prog.stageType === "NON_STAGE"
                                      ? "text-sky-600 border-sky-200 bg-sky-500/10"
                                      : "text-rose-600 border-rose-200 bg-rose-500/10",
                                  )}
                                >
                                  {prog.stageType === "NON_STAGE"
                                    ? "Offstage"
                                    : "Stage"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-bold tabular-nums">
                                {prog.points}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center text-muted-foreground py-6"
                            >
                              No programmes found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
