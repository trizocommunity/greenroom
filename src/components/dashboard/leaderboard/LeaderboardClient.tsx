"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Crown, CheckCircle2, Loader2, Medal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { publishTeamStandings } from "@/server/actions/results";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { cn } from "@/lib/utils";
import { useFestivalReadOnly } from "@/hooks/useFestivalReadOnly";

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
  defaultStudentFilterCategory?: string;
  defaultStudentFilterGroup?: string;
  hideStudentFilters?: boolean;
  readOnly?: boolean;
  hideLiveStandings?: boolean;
  children?: React.ReactNode;
}

export function LeaderboardClient({
  festival,
  results,
  publishedStandings = [],
  categories = [],
  groups = [],
  defaultStudentFilterCategory,
  defaultStudentFilterGroup,
  hideStudentFilters = false,
  readOnly = false,
  hideLiveStandings = false,
  children,
}: LeaderboardClientProps) {
  const { isReadOnly: lifecycleReadOnly } = useFestivalReadOnly();
  const effectiveReadOnly = readOnly || lifecycleReadOnly;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [studentFilterCategory, setStudentFilterCategory] = useState<string>(
    defaultStudentFilterCategory ?? "all",
  );
  const [studentFilterGroup, setStudentFilterGroup] = useState<string>(
    defaultStudentFilterGroup ?? "all",
  );

  // --- Leaderboard Calculation (Live Preview) ---
  const teamStandings = useMemo(() => {
    const scopedResults =
      studentFilterGroup === "all"
        ? results
        : results.filter((r: any) => r?.assignment?.group?.id === studentFilterGroup);

    const standings: Record<
      string,
      { name: string; points: number; isGroup: boolean }
    > = {};

    scopedResults.forEach((r) => {
      let teamName = "Unknown";
      let isGroup = false;

      // Check if result has direct team info (from previous implementations) or through assignment
      // ONLY count published results for the leaderboard snapshot
      if (!r.isPublished) return;

      if (r.assignment?.group) {
        teamName = r.assignment.group.name;
        isGroup = true;
      } else if (r.assignment?.student) {
        // Fallback to group name if available, otherwise skip for team leaderboard
        if (r.assignment?.group) {
          teamName = r.assignment.group.name;
          isGroup = true;
        } else {
          return;
        }
      } else {
        return;
      }

      if (!standings[teamName]) {
        standings[teamName] = { name: teamName, points: 0, isGroup };
      }
      standings[teamName].points += r.points || 0;
    });

    return Object.values(standings)
      .sort((a, b) => b.points - a.points)
      .map((team, index) => ({ ...team, rank: index + 1 }));
  }, [results, studentFilterGroup]);

  // Top students by points (published results only), filterable by category and group.
  // Only count points from INDIVIDUAL programmes; exclude GROUP programme points.
  const studentStandings = useMemo(() => {
    const byStudent: Record<
      string,
      {
        studentId: string;
        name: string;
        chestNumber: string | null;
        groupName: string | null;
        groupColor: string | null;
        categoryName: string | null;
        points: number;
      }
    > = {};

    results.forEach((r) => {
      if (!r.isPublished || !r.assignment?.student) return;
      // Only include points from individual programmes; never count group programme points
      if (r.programme?.type === "GROUP") return;
      // Filter by student's category (the category the student belongs to)
      if (
        studentFilterCategory !== "all" &&
        r.assignment.student?.categoryId !== studentFilterCategory
      )
        return;
      // Filter by student's group
      if (studentFilterGroup !== "all" && r.assignment?.groupId !== studentFilterGroup)
        return;

      const sid = r.assignment.student.id;
      const name = r.assignment.student.name ?? "Unknown";
      const chestNumber = r.assignment.student.chestNumber ?? null;
      const groupName = r.assignment.group?.name ?? null;
      const groupColor = r.assignment.group?.color ?? null;
      // Each student has one category (from their profile)
      const categoryName = r.assignment.student?.category?.name ?? null;

      if (!byStudent[sid]) {
        byStudent[sid] = {
          studentId: sid,
          name,
          chestNumber,
          groupName,
          groupColor,
          categoryName,
          points: 0,
        };
      }
      byStudent[sid].points += r.points ?? 0;
    });

    return Object.values(byStudent)
      .sort((a, b) => b.points - a.points)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [results, studentFilterCategory, studentFilterGroup]);

  const hasStudentFilters = studentFilterCategory !== "all" || studentFilterGroup !== "all";
  const clearStudentFilters = () => {
    setStudentFilterCategory("all");
    setStudentFilterGroup("all");
  };

  const publishedStandingsFiltered = useMemo(() => {
    if (!groups?.length) return publishedStandings;
    if (studentFilterGroup === "all") return publishedStandings;
    const groupName = groups.find((g) => g.id === studentFilterGroup)?.name;
    if (!groupName) return [];
    return (publishedStandings ?? []).filter((t: any) => t?.name === groupName);
  }, [groups, publishedStandings, studentFilterGroup]);

  const [updatingStandingsId, setUpdatingStandingsId] = useState<string | null>(
    null,
  );

  return (
    <div className="space-y-4">
      {/* Header row: children left, Publish right — icon only on mobile */}
      <div className="flex flex-row items-center justify-between gap-4">
        {children ?? (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Leaderboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
              Team and student standings from published results.
            </p>
          </div>
        )}
        {!effectiveReadOnly ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <HowItWorksButton
              title="How Leaderboard works"
              description="Team standings from published programme results."
            >
              <p className="text-sm text-muted-foreground">
                <strong>Live Standings</strong> show the current totals from all
                published programme results. They update as you publish or
                unpublish results from the Marks page.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Publish Standings</strong> copies the live snapshot to the
                public festival page so visitors can see the leaderboard.
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
              disabled={isPending}
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
        ) : null}
      </div>

      {/* Standings: Live + Published */}
      <section className="space-y-4">
        <div
          className={cn(
            "grid grid-cols-1 gap-4",
            hideLiveStandings ? "md:grid-cols-1" : "md:grid-cols-2",
          )}
        >
          {/* Live Standings Column */}
          {!hideLiveStandings ? (
            <Card className="p-0 overflow-hidden border-yellow-500/20">
              <div className="bg-yellow-500/10 p-4 border-b border-yellow-500/10 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Live Standings
                </h3>
                <Badge
                  variant="outline"
                  className="bg-yellow-50 text-yellow-700 border-yellow-200"
                >
                  Dynamic
                </Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamStandings.length > 0 ? (
                    teamStandings.map((team, idx) => (
                      <TableRow
                        key={team.name}
                        className={idx < 3 ? "bg-yellow-50/5" : ""}
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
                        No live data yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          ) : null}

          {/* Published Standings Column */}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {publishedStandingsFiltered && publishedStandingsFiltered.length > 0 ? (
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
                      No published results yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </section>

      {/* Top students by points */}
      <section className="space-y-3 pt-5">
        <Card className="p-0 overflow-hidden border-primary/20">
          <div className="flex flex-col gap-3 p-3 border-b bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-bold flex items-center gap-2 text-foreground">
              <Medal className="w-4 h-4 text-primary" />
              Top students by points
            </h3>
            {!hideStudentFilters ? (
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={studentFilterCategory}
                  onValueChange={setStudentFilterCategory}
                >
                  <SelectTrigger className="h-8 text-xs w-[140px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories
                      .filter((c: { id: string; name: string; type?: string }) => c.type !== "GENERAL")
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select
                  value={studentFilterGroup}
                  onValueChange={setStudentFilterGroup}
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
                {hasStudentFilters && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={clearStudentFilters}
                    title="Clear filters"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ) : null}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 text-center">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="hidden sm:table-cell">Group</TableHead>
                <TableHead className="text-right w-24">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentStandings.length > 0 ? (
                studentStandings.map((row, idx) => (
                  <TableRow
                    key={row.studentId}
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
                        <span className="text-muted-foreground">{row.rank}</span>
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
                              style={{ backgroundColor: row.groupColor ?? "#94a3b8" }}
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
                    {hasStudentFilters
                      ? "No students match the selected filters."
                      : "No published student results yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
