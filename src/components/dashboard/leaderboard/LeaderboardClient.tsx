"use client";

import { Crown, Medal } from "lucide-react";
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

  const festivalContext = useFestival();
  const tier = getResolvedTier(tierProp ?? festivalContext.tier);

  // Published team standings (filtered by group if selected).
  const publishedStandingsFiltered = useMemo(() => {
    if (!groups?.length) return publishedStandings;
    if (participantFilterGroup === "all") return publishedStandings;
    const groupName = groups.find((g) => g.id === participantFilterGroup)?.name;
    if (!groupName) return [];
    return (publishedStandings ?? []).filter((t: any) => t?.name === groupName);
  }, [groups, publishedStandings, participantFilterGroup]);

  // Top participants by points (individual programmes only).
  const participantStandings = useMemo(() => {
    const byParticipant: Record<
      string,
      {
        participantId: string;
        name: string;
        groupName: string | null;
        groupColor: string | null;
        categoryName: string | null;
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
      const groupName = a.group?.name ?? null;
      const groupColor = a.group?.color ?? null;
      const categoryName = a.participant?.category?.name ?? null;

      if (!byParticipant[sid]) {
        byParticipant[sid] = {
          participantId: sid,
          name,
          groupName,
          groupColor,
          categoryName,
          points: 0,
        };
      }
      byParticipant[sid].points += resultPointsOf(r);
    });

    return Object.values(byParticipant)
      .sort((a, b) => b.points - a.points)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [results, tier, participantFilterCategory, participantFilterGroup]);

  // Polling refresh every 15 seconds.
  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, 15000);
    return () => window.clearInterval(id);
  }, [router]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-4">
        {children ?? (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Leaderboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
              Team and participant standings from published results.
            </p>
          </div>
        )}

        {/* Filters */}
        {!hideParticipantFilters && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Select
              value={participantFilterCategory}
              onValueChange={setParticipantFilterCategory}
            >
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
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
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
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

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Left panel: Published team standings */}
        <Card className="p-0 overflow-hidden border-green-500/20">
          <div className="bg-green-500/10 p-4 border-b border-green-500/10 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-green-600 dark:text-green-500">
              <Crown className="w-4 h-4" />
              Team Standings
            </h3>
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {publishedStandingsFiltered &&
                publishedStandingsFiltered.length > 0 ? (
                  publishedStandingsFiltered.map((team: any, idx: number) => (
                    <TableRow
                      key={team.name}
                      className={idx < 3 ? "bg-green-50/5" : ""}
                    >
                      <TableCell className="text-center font-bold text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {team.name}
                        {idx === 0 && (
                          <Crown className="inline w-3 h-3 ml-1 text-yellow-600" />
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {team.points}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No published standings yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="md:hidden p-3 space-y-2">
            {publishedStandingsFiltered &&
            publishedStandingsFiltered.length > 0 ? (
              publishedStandingsFiltered.map((team: any, idx: number) => (
                <div
                  key={team.name}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border px-3 py-2",
                    idx < 3
                      ? "border-green-500/25 bg-green-500/5"
                      : "border-border/70 bg-background",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-center">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {team.name}
                      </span>
                      {idx === 0 && (
                        <Crown className="w-4 h-4 text-yellow-600" />
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-bold tabular-nums">
                    {team.points}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No published standings yet.
              </p>
            )}
          </div>
        </Card>

        {/* Right panel: Top participants (individual programmes only) */}
        <Card className="p-0 overflow-hidden border-primary/20">
          <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-foreground">
              <Medal className="w-4 h-4 text-primary" />
              Top Participants
            </h3>
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 text-center">Place</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right w-24">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participantStandings.length > 0 ? (
                  participantStandings.map((row, idx) => (
                    <TableRow
                      key={row.participantId}
                      className={cn(
                        idx < 3 && "bg-primary/5",
                        idx === 0 && "border-l-4 border-l-yellow-500",
                        idx === 1 && "border-l-4 border-l-gray-400",
                        idx === 2 && "border-l-4 border-l-amber-600",
                      )}
                    >
                      <TableCell className="text-center font-bold text-muted-foreground">
                        {row.rank}
                      </TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {row.categoryName ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <span className="flex items-center gap-2">
                          {row.groupName ? (
                            <>
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/50 shadow-sm"
                                style={{
                                  backgroundColor: row.groupColor ?? "#94a3b8",
                                }}
                                aria-hidden
                              />
                              {row.groupName}
                            </>
                          ) : (
                            "—"
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {row.points}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
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
              participantStandings.map((row, idx) => (
                <div
                  key={row.participantId}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-lg border px-3 py-2",
                    idx < 3
                      ? "border-primary/25 bg-primary/5"
                      : "border-border/70 bg-background",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-6 text-center text-xs font-bold text-muted-foreground">
                        {row.rank}
                      </div>
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
                  <div className="text-sm font-bold tabular-nums pt-0.5">
                    {row.points}
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
