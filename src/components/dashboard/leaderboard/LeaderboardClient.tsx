"use client";

import { Crown, Flame, Medal, Search, Sparkles, Trophy, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFestival } from "@/components/festival/FestivalContext";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
import {
  getResolvedTier,
} from "@/features/plan-features/services/tier";
import {
  getParticipantLeaderboardView,
  isResultVisibleForLeaderboard,
} from "@/features/results/services/leaderboard-visibility.service";

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
    row: "bg-amber-500/10 hover:bg-amber-500/15",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  },
  {
    ring: "ring-slate-300/60",
    bg: "bg-gradient-to-br from-slate-300 to-slate-400",
    text: "text-slate-900",
    row: "bg-slate-400/10 hover:bg-slate-400/15",
    badge: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  },
  {
    ring: "ring-orange-400/60",
    bg: "bg-gradient-to-br from-orange-400 to-amber-600",
    text: "text-orange-950",
    row: "bg-orange-500/10 hover:bg-orange-500/15",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
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

  const festivalContext = useFestival();
  const tier = getResolvedTier(tierProp ?? festivalContext.tier);

  // Published team standings (filtered by group if selected).
  const publishedStandingsFiltered = useMemo(() => {
    let standingsToUse = publishedStandings ?? [];

    if (groups?.length) {
      const standingsMap = new Map(standingsToUse.map((t: any) => [t.name, t]));
      for (const g of groups) {
        if (!standingsMap.has(g.name)) {
          standingsMap.set(g.name, { name: g.name, points: 0, rank: 999 });
        }
      }
      standingsToUse = Array.from(standingsMap.values())
        .sort((a, b) => b.points - a.points)
        .map((row, index) => ({ ...row, rank: index + 1 }));
    }

    if (!groups?.length) return standingsToUse;
    if (participantFilterGroup === "all") return standingsToUse;
    const groupName = groups.find((g) => g.id === participantFilterGroup)?.name;
    if (!groupName) return [];
    return standingsToUse.filter((t: any) => t?.name === groupName);
  }, [groups, publishedStandings, participantFilterGroup]);

  // Top participants by points (individual programmes only).
  const participantStandings = useMemo(() => {
    const byParticipant: Record<
      string,
      {
        participantId: string;
        name: string;
        gender: string | null;
        groupName: string | null;
        groupColor: string | null;
        categoryName: string | null;
        offstage: number;
        stage: number;
        points: number;
      }
    > = {};

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
        };
      }

      const p = resultPointsOf(r);
      byParticipant[sid].points += p;
      if (r.programme?.stageType === "NON_STAGE") {
        byParticipant[sid].offstage += p;
      } else {
        byParticipant[sid].stage += p;
      }
    });

    return Object.values(byParticipant)
      .filter((p) => {
        if (!searchQuery) return true;
        return p.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => b.points - a.points)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [results, tier, participantFilterCategory, participantFilterGroup, searchQuery]);

  // Polling refresh every 15 seconds.
  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, 15000);
    return () => window.clearInterval(id);
  }, [router]);

  const topThreeTeams = publishedStandingsFiltered.slice(0, 3);
  const restTeams = publishedStandingsFiltered.slice(3);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-4">
        {children ?? (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/25">
                <Trophy className="h-4.5 w-4.5" />
              </span>
              Leaderboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Group and participant standings from published results.
            </p>
          </div>
        )}
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        {/* Left panel: Published group standings */}
        <Card className="p-0 overflow-hidden border-0 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20 lg:col-span-1">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-white">
              <Crown className="w-4 h-4" />
              Group Standings
            </h3>
            <Sparkles className="w-4 h-4 text-emerald-100/70" />
          </div>

          {publishedStandingsFiltered.length > 0 ? (
            <div className="p-3 space-y-2">
              {/* Podium: top 3 */}
              {topThreeTeams.map((team: any, idx: number) => {
                const style = RANK_STYLES[idx];
                return (
                  <div
                    key={team.name}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors",
                      style.row,
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <RankBadge rank={idx + 1} />
                      <span className="text-sm font-semibold truncate">
                        {team.name}
                      </span>
                      {idx === 0 && (
                        <Crown className="w-4 h-4 shrink-0 text-amber-500" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-sm font-black tabular-nums",
                        style.badge,
                      )}
                    >
                      {team.points}
                    </span>
                  </div>
                );
              })}

              {/* Rest */}
              {restTeams.map((team: any, idx: number) => (
                <div
                  key={team.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <RankBadge rank={idx + 4} />
                    <span className="text-sm font-medium truncate">
                      {team.name}
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-muted-foreground">
                    {team.points}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Medal className="mx-auto h-8 w-8 mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No published standings yet.
              </p>
            </div>
          )}
        </Card>

        {/* Right panel: Top participants (individual programmes only) */}
        <Card className="p-0 overflow-hidden border-0 shadow-lg shadow-violet-500/5 ring-1 ring-violet-500/20 lg:col-span-3">
          <div className="p-4 border-b border-violet-500/10 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent">
            <div className="flex flex-col gap-1 mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Flame className="h-5 w-5 text-fuchsia-500" />
                Top Scorers
              </h3>
              <p className="text-sm text-muted-foreground">
                View event top performers and their total points (only includes published results)
              </p>
            </div>
            {!hideParticipantFilters && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search participants..."
                    className="h-9 pl-8 w-full bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select
                  value={participantFilterCategory}
                  onValueChange={setParticipantFilterCategory}
                >
                  <SelectTrigger className="h-9 text-sm w-[150px] bg-background">
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
                  <SelectTrigger className="h-9 text-sm w-[150px] bg-background">
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
            )}
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-14 text-center font-semibold text-foreground">#</TableHead>
                  <TableHead className="font-semibold text-foreground">Participant</TableHead>
                  <TableHead className="font-semibold text-foreground">Gender</TableHead>
                  <TableHead className="font-semibold text-foreground">Group</TableHead>
                  <TableHead className="font-semibold text-foreground">Category</TableHead>
                  <TableHead className="font-semibold text-foreground text-right w-24">Offstage</TableHead>
                  <TableHead className="font-semibold text-foreground text-right w-24">Stage</TableHead>
                  <TableHead className="font-semibold text-foreground text-right w-28">Total Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participantStandings.length > 0 ? (
                  participantStandings.map((row) => (
                    <TableRow
                      key={row.participantId}
                      className={cn(RANK_STYLES[row.rank - 1]?.row)}
                    >
                      <TableCell className="text-center">
                        <RankBadge rank={row.rank} />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.gender ? row.gender.charAt(0).toUpperCase() + row.gender.slice(1).toLowerCase() : "—"}
                      </TableCell>
                      <TableCell>
                        {row.groupName ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full shadow-sm"
                              style={{ backgroundColor: row.groupColor ?? "#94a3b8" }}
                              aria-hidden
                            />
                            <span className="text-muted-foreground">{row.groupName}</span>
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
              participantStandings.map((row) => (
                <div
                  key={row.participantId}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5",
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
                      {row.points} <span className="text-[10px] font-normal text-muted-foreground">pts</span>
                    </div>
                    <div className="text-[10px] flex gap-2 mt-1">
                      <span className="text-sky-600 dark:text-sky-400" title="Offstage Points">Off: {row.offstage}</span>
                      <span className="text-rose-600 dark:text-rose-400" title="Stage Points">Stg: {row.stage}</span>
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
      </div>
    </div>
  );
}
