"use client";

import { Loader2, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AnnouncerBlockProgressBanner } from "@/components/dashboard/announcement/AnnouncerBlockProgressBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  beginNextResultsBatch,
  publishAnnouncedStandings,
  type TeamStandingInput,
} from "@/features/announcement/actions/announcement.actions";
import type { AnnouncerBlockProgress } from "@/features/announcement/services/announcer-result-count.service";
import { computeAnnouncedTeamStandings } from "@/features/announcement/services/group-standings.service";

interface GroupStandingsClientProps {
  festivalId: string;
  festivalSlug: string;
  groups: { id: string; name: string }[];
  results: any[];
  publishedStandings: TeamStandingInput[];
  publicDisplayMode: "programme_results" | "team_standings";
  block: AnnouncerBlockProgress;
}

export function GroupStandingsClient({
  festivalId,
  festivalSlug,
  groups,
  results,
  publishedStandings,
  publicDisplayMode,
  block,
}: GroupStandingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [groupFilter, setGroupFilter] = useState<string>("all");

  const preview = useMemo(() => {
    const filterId = groupFilter === "all" ? undefined : groupFilter;
    return computeAnnouncedTeamStandings(results, filterId);
  }, [results, groupFilter]);

  const canPublish = block.canPublishStandings && preview.length > 0;

  const handlePublish = () => {
    if (!block.canPublishStandings) {
      toast.error(
        `Announce at least ${block.resultsPerBlock} results on-air first (${block.announcedResultsSinceStandings}/${block.resultsPerBlock})`,
      );
      return;
    }
    if (preview.length === 0) {
      toast.error("No announced results to build standings from");
      return;
    }
    startTransition(async () => {
      const res = await publishAnnouncedStandings(festivalId, preview);
      if (!res.success) {
        toast.error(res.error ?? "Failed to publish standings");
        return;
      }
      toast.success(
        "Team standings published — public site shows standings only",
      );
      router.refresh();
    });
  };

  const handleResumeResults = () => {
    startTransition(async () => {
      const res = await beginNextResultsBatch(festivalId);
      if (!res.success) {
        toast.error(res.error ?? "Failed to resume results mode");
        return;
      }
      toast.success("Public site resumed programme results display");
      router.refresh();
    });
  };

  const showPublishedOnPublic =
    block.canPublishStandings || publicDisplayMode === "team_standings";

  return (
    <div className="space-y-6">
      <AnnouncerBlockProgressBanner block={block} festivalSlug={festivalSlug} />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          Public mode:{" "}
          {publicDisplayMode === "team_standings"
            ? "Team standings only"
            : "Programme results"}
        </Badge>
        {publicDisplayMode === "team_standings" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleResumeResults}
          >
            Resume programme results on public site
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Standings preview</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Built from announced results. Publish only after reaching the
              configured number of results ({block.resultsPerBlock}).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All groups" />
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
            <Button disabled={isPending || !canPublish} onClick={handlePublish}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trophy className="h-4 w-4 mr-1" />
              )}
              Publish to public
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!block.canPublishStandings ? (
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              Publish is disabled until {block.resultsPerBlock} results are
              announced on-air ({block.announcedResultsSinceStandings}/
              {block.resultsPerBlock}).
            </p>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Team / Group</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((row) => (
                <TableRow key={row.name}>
                  <TableCell>{row.rank}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-right font-medium">
                    {row.points}
                  </TableCell>
                </TableRow>
              ))}
              {preview.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground py-8"
                  >
                    Announce programme results on Announcement first.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showPublishedOnPublic && publishedStandings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Published on public site
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {publishedStandings.map((row) => (
                  <TableRow key={`${row.rank}-${row.name}`}>
                    <TableCell>{row.rank}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">{row.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
