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

// Types matching what's passed from the page
interface TeamStatusClientProps {
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

export function TeamStatusClient({
  festival,
  programmes,
  results, // This contains ALL results, including unpublished ones
  publishedStandings = [], // Default to empty array
}: TeamStatusClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

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
        // Check status
        const total = p.assignments.length;
        const published = p.assignments.filter(
          (a: any) => a.result?.isPublished,
        ).length;
        const completed = p.assignments.filter(
          (a: any) =>
            a.result?.points !== undefined && a.result?.points !== null,
        ).length;

        let status:
          | "published"
          | "partial"
          | "ready"
          | "in-progress"
          | "pending" = "pending";

        if (total > 0 && published === total) status = "published";
        else if (published > 0) status = "partial";
        else if (total > 0 && completed === total) status = "ready";
        else if (completed > 0) status = "in-progress";

        return {
          ...p,
          stats: { total, published, completed, status },
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
                      <span className="opacity-50">/{prog.stats.total}</span>
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
    </div>
  );
}
