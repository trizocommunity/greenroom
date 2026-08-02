"use client";

import { CheckCircle2, Crown, Loader2, Medal, Trophy, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { useFestival } from "@/components/festival/FestivalContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import {
  isBasicTier as checkBasicTier,
  getResolvedTier,
} from "@/features/plan-features/services/tier";
import { publishTeamStandings } from "@/features/results/actions/results.actions";
import {
  filterResultsForLeaderboard,
  getParticipantLeaderboardView,
  getTeamDeskLeaderboardView,
  isResultVisibleForLeaderboard,
  type LeaderboardResultView,
} from "@/features/results/services/leaderboard-visibility.service";

/** Drizzle returns `programmeAssignment`; older code used `assignment`. */
function assignmentOf(r: any) {
  return r.programmeAssignment ?? r.assignment;
}

function resultPointsOf(r: any): number {
  return (r?.awardPoints ?? r?.points ?? 0) as number;
}

function buildTeamStandings(
  results: any[],
  tier: Tier | string | null | undefined,
  view: LeaderboardResultView,
  groupFilter: string,
) {
  const scopedResults =
    groupFilter === "all"
      ? results
      : results.filter((r: any) => {
          const a = assignmentOf(r);
          return a?.group?.id === groupFilter;
        });

  const visible = filterResultsForLeaderboard(scopedResults, tier, view);
  const standings: Record<
    string,
    { name: string; points: number; isGroup: boolean }
  > = {};
  const countedGroupProgrammeTeams = new Set<string>();

  visible.forEach((r) => {
    let teamName = "Unknown";
    let isGroup = false;
    const a = assignmentOf(r);
    if (!a) return;
    if (a.group) {
      teamName = a.group.name;
      isGroup = true;
    } else if (a.participant) {
      teamName = a.participant.name ?? "Unknown";
    } else return;

    if (!standings[teamName]) {
      standings[teamName] = { name: teamName, points: 0, isGroup };
    }
    if (r.programme?.type === "GROUP" && a.group?.id) {
      const teamProgrammeKey = `${r.programme.id}:${a.group.id}:${a.teamNumber ?? 1}`;
      if (countedGroupProgrammeTeams.has(teamProgrammeKey)) return;
      countedGroupProgrammeTeams.add(teamProgrammeKey);
    }
    standings[teamName].points += resultPointsOf(r);
  });

  return Object.values(standings)
    .sort((a, b) => b.points - a.points)
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

type TeamStandingRow = {
  name: string;
  points: number;
  rank: number;
};

function renderTeamStandingsTable(
  teams: TeamStandingRow[],
  emptyMessage: string,
  accent: "primary" | "yellow" | "amber",
) {
  const rowHighlight =
    accent === "primary"
      ? "bg-primary/5"
      : accent === "yellow"
        ? "bg-yellow-50/5"
        : "bg-amber-50/5";
  const mobileBorder =
    accent === "primary"
      ? "border-primary/25 bg-primary/5"
      : accent === "yellow"
        ? "border-yellow-500/25 bg-yellow-500/5"
        : "border-amber-500/25 bg-amber-500/5";

  return (
    <>
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
            {teams.length > 0 ? (
              teams.map((team, idx) => (
                <TableRow
                  key={team.name}
                  className={idx < 3 ? rowHighlight : ""}
                >
                  <TableCell className="text-center font-bold text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {team.name}
                    {idx === 0 && (
                      <Crown className="inline w-3 h-3 ml-1 text-yellow-500" />
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
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="md:hidden p-3 space-y-2">
        {teams.length > 0 ? (
          teams.map((team, idx) => (
            <div
              key={team.name}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border px-3 py-2",
                idx < 3 ? mobileBorder : "border-border/70 bg-background",
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
                  {idx === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                </div>
              </div>
              <div className="text-sm font-bold tabular-nums">
                {team.points}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            {emptyMessage}
          </p>
        )}
      </div>
    </>
  );
}

// Types matching what's passed from the page
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
  readOnly = false,
  hideLiveStandings = false,
  festivalRole,
  tier: tierProp,
  children,
}: LeaderboardClientProps) {
  const isAnnouncerOnly = festivalRole === "ANNOUNCER";
  const { isReadOnly: lifecycleReadOnly } = useFestivalReadOnly();
  const effectiveReadOnly = readOnly || lifecycleReadOnly;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [participantFilterCategory, setParticipantFilterCategory] =
    useState<string>(defaultParticipantFilterCategory ?? "all");
  const [participantFilterGroup, setParticipantFilterGroup] = useState<string>(
    defaultParticipantFilterGroup ?? "all",
  );

  const festivalContext = useFestival();
  const tier = getResolvedTier(tierProp ?? festivalContext.tier);
  const isBasicTier = checkBasicTier(tier);

  const teamStandings = useMemo(
    () =>
      buildTeamStandings(
        results,
        tier,
        getTeamDeskLeaderboardView(tier),
        participantFilterGroup,
      ),
    [results, tier, participantFilterGroup],
  );

  // Top participants by points (published results only), filterable by category and group.
  // Only count points from INDIVIDUAL programmes; exclude GROUP programme points.
  const participantStandings = useMemo(() => {
    const byParticipant: Record<
      string,
      {
        participantId: string;
        name: string;
        chestNumber: string | null;
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

      // Filter by participant's category (the category the participant belongs to)
      if (
        participantFilterCategory !== "all" &&
        a.participant?.categoryId !== participantFilterCategory
      )
        return;
      // Filter by participant's group
      if (
        participantFilterGroup !== "all" &&
        a.groupId !== participantFilterGroup
      )
        return;

      const sid = a.participant.id;
      const name = a.participant.name ?? "Unknown";
      const chestNumber = a.participant.chestNumber ?? null;
      const groupName = a.group?.name ?? null;
      const groupColor = a.group?.color ?? null;
      // Each participant has one category (from their profile)
      const categoryName = a.participant?.category?.name ?? null;

      if (!byParticipant[sid]) {
        byParticipant[sid] = {
          participantId: sid,
          name,
          chestNumber,
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

  const hasParticipantFilters =
    participantFilterCategory !== "all" || participantFilterGroup !== "all";
  const clearParticipantFilters = () => {
    setParticipantFilterCategory("all");
    setParticipantFilterGroup("all");
  };

  const publishedStandingsFiltered = useMemo(() => {
    if (!groups?.length) return publishedStandings;
    if (participantFilterGroup === "all") return publishedStandings;
    const groupName = groups.find((g) => g.id === participantFilterGroup)?.name;
    if (!groupName) return [];
    return (publishedStandings ?? []).filter((t: any) => t?.name === groupName);
  }, [groups, publishedStandings, participantFilterGroup]);

  const hasStandingsChanges = useMemo(() => {
    const normalize = (items: Array<{ name: string; points: number }>) =>
      items.map((item) => ({
        name: item.name,
        points: Number(item.points ?? 0),
      }));
    const live = normalize(teamStandings);
    const published = normalize(publishedStandings ?? []);
    return JSON.stringify(live) !== JSON.stringify(published);
  }, [publishedStandings, teamStandings]);

  const [updatingStandingsId, setUpdatingStandingsId] = useState<string | null>(
    null,
  );

  // Polling refresh every 15 seconds for updates
  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, 15000);
    return () => window.clearInterval(id);
  }, [router]);

  return (
    <div className="space-y-4">
      {/* Header row: children left, Publish right — icon only on mobile */}
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
        {!effectiveReadOnly && !isBasicTier && !isAnnouncerOnly ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <HowItWorksButton
              title="How Leaderboard works"
              description="Team standings from published programme results."
            >
              <p className="text-sm text-muted-foreground">
                <strong>Live standings</strong> totals include every published
                programme result. They update automatically as results are
                announced.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Publish Standings</strong> copies the current snapshot to
                the public festival page.
              </p>
            </HowItWorksButton>
            <Button
              variant="default"
              size="sm"
              className="gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (effectiveReadOnly) return;
                setUpdatingStandingsId("standings");
                startTransition(async () => {
                  try {
                    const res = await publishTeamStandings(
                      festival.id,
                      teamStandings,
                      festival.slug,
                    );
                    if (res.success) {
                      toast.success("Team Standings published to public page");
                      router.refresh();
                    } else {
                      toast.error("Failed to publish standings");
                    }
                  } finally {
                    setUpdatingStandingsId(null);
                  }
                });
              }}
              disabled={isPending || !hasStandingsChanges}
              title="Publish Standings"
            >
              {isPending && updatingStandingsId === "standings" ? (
                <Loader2 className="w-4 h-4 sm:mr-0 shrink-0 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 sm:mr-0 shrink-0" />
              )}
              <span className="hidden sm:inline">Publish Standings</span>
            </Button>
          </div>
        ) : isBasicTier ? (
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 gap-1 px-3 py-1"
            >
              <Trophy className="w-3.5 h-3.5" />
              Internal Leaderboard
            </Badge>
          </div>
        ) : null}
      </div>

      {/* Standings: desk / on-air / published */}
      <section className="space-y-4">
        <div
          className={cn(
            "grid grid-cols-1 gap-4",
            hideLiveStandings
              ? "md:grid-cols-1"
              : isBasicTier
                ? "md:grid-cols-1"
                : "md:grid-cols-2",
          )}
        >
          {!hideLiveStandings ? (
            <Card className="p-0 overflow-hidden border-primary/20">
              <div className="p-4 border-b flex items-center justify-between bg-primary/5 border-primary/10">
                <div>
                  <h3 className="font-bold text-foreground">
                    {isBasicTier ? "Team standings" : "Live standings"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Published programme results
                  </p>
                </div>
                {!isBasicTier && (
                  <Badge
                    variant="outline"
                    className="bg-primary/5 text-primary border-primary/20"
                  >
                    Live
                  </Badge>
                )}
              </div>
              {renderTeamStandingsTable(
                teamStandings,
                "No published results yet.",
                "primary",
              )}
            </Card>
          ) : null}

          {!isBasicTier && (
            <Card className="p-0 overflow-hidden border-green-500/20">
              <div className="bg-green-500/10 p-4 border-b border-green-500/10 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2 text-green-600 dark:text-green-500">
                  <CheckCircle2 className="w-4 h-4" />
                  Published Standings
                </h3>
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  Public Visible
                </Badge>
              </div>

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
                      publishedStandingsFiltered.map(
                        (team: any, idx: number) => (
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
                        ),
                      )
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No published results yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

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
                    No published results yet.
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* Top participants by points */}
      <section className="space-y-3 pt-5">
        <Card className="p-0 overflow-hidden border-primary/20">
          <div className="flex flex-col gap-3 p-3 border-b bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-bold flex items-center gap-2 text-foreground">
              <Medal className="w-4 h-4 text-primary" />
              Top participants by points
            </h3>
            {!hideParticipantFilters ? (
              <div className="flex flex-wrap items-center gap-2">
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
                      .filter(
                        (c: { id: string; name: string; type?: string }) =>
                          c.type !== "GENERAL",
                      )
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
                {hasParticipantFilters && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={clearParticipantFilters}
                    title="Clear filters"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ) : null}
          </div>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 text-center">#</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Category
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Group</TableHead>
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
                      <TableCell className="text-center font-bold">
                        {idx < 3 ? (
                          <span className="flex items-center justify-center gap-0.5">
                            {idx === 0 && (
                              <span className="text-yellow-500" title="1st">
                                🥇
                              </span>
                            )}
                            {idx === 1 && (
                              <span className="text-gray-500" title="2nd">
                                🥈
                              </span>
                            )}
                            {idx === 2 && (
                              <span className="text-amber-600" title="3rd">
                                🥉
                              </span>
                            )}
                            <span className="text-muted-foreground ml-0.5">
                              {row.rank}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {row.rank}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.name}</div>
                        {row.chestNumber && (
                          <div className="text-xs text-muted-foreground">
                            #{row.chestNumber}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {row.categoryName ?? "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        <span className="flex items-center gap-2">
                          {row.groupName ? (
                            <>
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/50 shadow-sm"
                                style={{
                                  backgroundColor: row.groupColor ?? "#94a3b8",
                                }}
                                title={row.groupName}
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
                      {hasParticipantFilters
                        ? "No participants match the selected filters."
                        : isBasicTier
                          ? "No published participant results yet."
                          : "No on-air participant results yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

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
                        {idx === 0
                          ? "🥇"
                          : idx === 1
                            ? "🥈"
                            : idx === 2
                              ? "🥉"
                              : row.rank}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{row.name}</div>
                        {row.chestNumber && (
                          <div className="text-xs text-muted-foreground">
                            #{row.chestNumber}
                          </div>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                          <span>{row.categoryName ?? "—"}</span>
                          <span className="inline-flex items-center gap-2">
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
                {hasParticipantFilters
                  ? "No participants match the selected filters."
                  : isBasicTier
                    ? "No published participant results yet."
                    : "No on-air participant results yet."}
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
