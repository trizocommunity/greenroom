"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Crown,
  Medal,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import {
  bulkPublishProgrammeResults,
  publishTeamStandings,
} from "@/server/actions/results";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getGradeBadgeColor } from "@/lib/results-calculator";
import { Eye } from "lucide-react";

const getTeamName = (assignment: any, type: string) => {
  if (type === "GROUP" && assignment.group) {
    return assignment.group.name;
  }
  return assignment.student?.name || "Unknown";
};

const getTeamIdentifier = (assignment: any, type: string) => {
  if (type === "GROUP") {
    // Group by visible identity: Group Name + Team Number
    // This is more robust when group IDs might be unique per student but they are meant to be in the same team
    const groupName = assignment.group?.name || "No Group";
    const teamNum = assignment.teamNumber || 1;
    return `${groupName}-${teamNum}`;
  }
  return assignment.id;
};

// Types matching what's passed from the page
interface LeaderboardClientProps {
  festival: {
    id: string;
    name: string;
    slug: string;
    accentColor?: string | null;
  };
  programmes: any[]; // Using any for now to match the complex Prisma include, will refine if needed
  results: any[];
  publishedStandings?: any[]; // Added prop
}

export function LeaderboardClient({
  festival,
  programmes,
  results, // This contains ALL results, including unpublished ones
  publishedStandings = [], // Default to empty array
}: LeaderboardClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // View Details Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewProgramme, setViewProgramme] = useState<any | null>(null);

  // View Details Calculation
  const viewDetailsResults = useMemo(() => {
    if (!viewProgramme) return [];

    if (viewProgramme.type === "GROUP") {
      // Group by Team
      const teamMap = new Map<string, any>();

      viewProgramme.assignments.forEach((assignment: any) => {
        // Only consider assignments with results for the results view
        if (assignment.result?.score == null) return;

        const teamId = getTeamIdentifier(assignment, "GROUP");

        if (!teamMap.has(teamId)) {
          // Try to find a valid group name if available, otherwise construct one
          const groupName =
            assignment.group?.name || `Team ${assignment.teamNumber}`;

          teamMap.set(teamId, {
            assignmentId: assignment.id, // Use the first found assignment ID as key
            displayName: groupName,
            subText:
              assignment.teamNumber > 0 ? `Team ${assignment.teamNumber}` : "",
            chestNumber: "",
            grade: assignment.result.grade,
            score: assignment.result.score,
            points: assignment.result.points,
            position: assignment.result.position || 0,
            remarks: assignment.result.remarks,
            memberCount: 0,
          });
        }

        const entry = teamMap.get(teamId);
        entry.memberCount++;
      });

      return Array.from(teamMap.values()).sort((a: any, b: any) => {
        if (a.position && b.position) return a.position - b.position;
        return (b.score || 0) - (a.score || 0);
      });
    } else {
      // INDIVIDUAL
      const details = viewProgramme.assignments
        .filter((a: any) => a.result?.score != null)
        .map((assignment: any) => {
          const result = assignment.result!;
          return {
            assignmentId: assignment.id,
            displayName: assignment.student?.name || "Unknown Student",
            subText: "",
            chestNumber: assignment.student?.chestNumber
              ? `#${assignment.student.chestNumber}`
              : "",
            grade: result.grade,
            score: result.score,
            points: result.points,
            position: result.position || 0,
            remarks: result.remarks,
          };
        });

      return details.sort((a: any, b: any) => {
        if (a.position && b.position) return a.position - b.position;
        return (b.score || 0) - (a.score || 0);
      });
    }
  }, [viewProgramme]);

  const handleViewDetails = (programme: any) => {
    setViewProgramme(programme);
    setIsViewModalOpen(true);
  };

  // --- Leaderboard Calculation (Live Preview) ---
  const teamStandings = useMemo(() => {
    const standings: Record<
      string,
      { name: string; points: number; isGroup: boolean }
    > = {};

    results.forEach((r) => {
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
  }, [results]);

  // --- Programme Management (Publishing) ---
  const filteredProgrammes = useMemo(() => {
    let progs = programmes;
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      progs = progs.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.category?.name.toLowerCase().includes(lower),
      );
    }
    return progs
      .map((p) => {
        // Effective Counts (Teams for Groups, Students for Individual)
        let finalTotal = p.assignments.length;
        let finalCompleted = p.assignments.filter(
          (a: any) =>
            a.result?.points !== undefined && a.result?.points !== null,
        ).length;
        let finalPublished = p.assignments.filter(
          (a: any) => a.result?.isPublished,
        ).length;

        if (p.type === "GROUP") {
          const uniqueTeams = new Set<string>();
          const completedTeams = new Set<string>();
          const publishedTeams = new Set<string>();

          p.assignments.forEach((a: any) => {
            const teamId = getTeamIdentifier(a, "GROUP");
            uniqueTeams.add(teamId);
            if (a.result?.points != null) completedTeams.add(teamId);
            if (a.result?.isPublished) publishedTeams.add(teamId);
          });

          finalTotal = uniqueTeams.size;
          finalCompleted = completedTeams.size;
          finalPublished = publishedTeams.size;
        }

        let status:
          | "published"
          | "partial"
          | "ready"
          | "in-progress"
          | "pending" = "pending";

        if (finalTotal > 0 && finalPublished === finalTotal)
          status = "published";
        else if (finalPublished > 0) status = "partial";
        else if (finalTotal > 0 && finalCompleted === finalTotal)
          status = "ready";
        else if (finalCompleted > 0) status = "in-progress";

        return {
          ...p,
          stats: {
            total: finalTotal,
            published: finalPublished,
            completed: finalCompleted,
            status,
          },
        };
      })
      .filter((p) =>
        ["published", "partial", "ready"].includes(p.stats.status),
      );
  }, [programmes, searchQuery]);

  const [updatingProgrammeId, setUpdatingProgrammeId] = useState<string | null>(
    null,
  );

  const handleTogglePublish = (programmeId: string, currentStatus: boolean) => {
    setUpdatingProgrammeId(programmeId);
    startTransition(async () => {
      try {
        const newStatus = !currentStatus;
        const res = await bulkPublishProgrammeResults(
          programmeId,
          newStatus,
          festival.slug,
        );
        if (res?.success) {
          toast.success(
            `Results ${newStatus ? "published" : "unpublished"} successfully`,
          );
        } else {
          toast.error("Failed to update status");
        }
      } finally {
        setUpdatingProgrammeId(null);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Section: Live Leaderboard Preview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Crown className="w-6 h-6 text-yellow-500" />
              Live Team Standings
            </h2>
            <p className="text-muted-foreground">
              Based on <strong>PUBLISHED</strong> results only. Publish
              individual programme results below to update this list.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Link to Public Page */}
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setUpdatingProgrammeId("standings");
                  startTransition(async () => {
                    try {
                      const res = await publishTeamStandings(
                        festival.id,
                        teamStandings,
                        festival.slug,
                      );
                      if (res.success) {
                        toast.success(
                          "Team Standings published to public page",
                        );
                        router.refresh();
                      } else {
                        toast.error("Failed to publish standings");
                      }
                    } finally {
                      setUpdatingProgrammeId(null);
                    }
                  });
                }}
                disabled={isPending}
              >
                {isPending && updatingProgrammeId === "standings" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Publish Standings
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Live Standings Column */}
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
                {publishedStandings && publishedStandings.length > 0 ? (
                  publishedStandings.map((team: any, idx: number) => (
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

      {/* Second Section: Results Publishing Management */}
      <section className="space-y-4 pt-8 border-t">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Manage Results</h2>
            <p className="text-muted-foreground">
              Publish or unpublish results for each programme.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search programmes..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              suppressHydrationWarning
            />
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Programme</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Entries</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-end">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProgrammes.length > 0 ? (
                filteredProgrammes.map((prog) => (
                  <TableRow key={prog.id} className="group">
                    <TableCell className="font-medium">{prog.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{prog.category.name}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm">
                      <div className="flex flex-col items-center">
                        <div>
                          <span
                            className={
                              prog.stats.completed === prog.stats.total &&
                              prog.stats.total > 0
                                ? "text-green-600 font-bold"
                                : ""
                            }
                          >
                            {prog.stats.completed}
                          </span>
                          <span className="opacity-50">
                            /{prog.stats.total}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {prog.stats.status === "published" && (
                        <Badge className="bg-green-600 hover:bg-green-700 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Published
                        </Badge>
                      )}
                      {prog.stats.status === "partial" && (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-800 gap-1"
                        >
                          <AlertCircle className="w-3 h-3" /> Partial
                        </Badge>
                      )}
                      {prog.stats.status === "ready" && (
                        <Badge
                          variant="outline"
                          className="text-blue-600 border-blue-200 bg-blue-50 gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </Badge>
                      )}
                      {prog.stats.status === "in-progress" && (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          In Progress
                        </Badge>
                      )}
                      {prog.stats.status === "pending" && (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground/50"
                        >
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      {/* Action Button */}
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(prog)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {prog.stats.status === "published" ||
                        prog.stats.status === "partial" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={() => handleTogglePublish(prog.id, true)}
                            disabled={isPending}
                          >
                            {isPending && updatingProgrammeId === prog.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Unpublish"
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className={cn(
                              prog.stats.status === "ready"
                                ? "bg-green-600 hover:bg-green-700"
                                : "",
                            )}
                            onClick={() => handleTogglePublish(prog.id, false)}
                            disabled={isPending || prog.stats.completed === 0}
                          >
                            {isPending && updatingProgrammeId === prog.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Publish"
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No programmes found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* View Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Medal className="w-5 h-5 text-primary" />
              {viewProgramme?.name} - Results
            </DialogTitle>
            <DialogDescription>
              {viewProgramme?.category.name} • {viewProgramme?.type} Event
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>
                    {viewProgramme?.type === "GROUP"
                      ? "Team"
                      : "Chest No & Name"}
                  </TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">Points</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewDetailsResults.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-6 text-muted-foreground"
                    >
                      No published results yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  viewDetailsResults.map((result: any) => (
                    <TableRow key={result.assignmentId}>
                      <TableCell className="font-bold">
                        {result.position > 0 ? (
                          <div className="flex items-center gap-1">
                            {result.position === 1 && (
                              <span className="text-yellow-500">🥇</span>
                            )}
                            {result.position === 2 && (
                              <span className="text-gray-400">🥈</span>
                            )}
                            {result.position === 3 && (
                              <span className="text-amber-700">🥉</span>
                            )}
                            <span>{result.position}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{result.displayName}</div>
                        {viewProgramme?.type === "INDIVIDUAL" ? (
                          <div className="text-xs text-muted-foreground">
                            {result.chestNumber} • {result.displayName}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            {result.subText}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono font-bold",
                            getGradeBadgeColor(result.grade),
                          )}
                        >
                          {result.grade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold">
                        {result.score}
                      </TableCell>
                      <TableCell className="text-center">
                        {result.points > 0 && (
                          <Badge variant="secondary" className="font-mono">
                            {result.points} pts
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {result.remarks || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
