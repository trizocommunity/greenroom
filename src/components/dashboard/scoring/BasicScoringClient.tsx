"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ProgrammeStatusBadge } from "@/components/festival/ProgrammeStatusBadge";
import { ProgrammeResultPosterSection } from "@/components/festival/posters/ProgrammeResultPosterSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProgrammeStatus } from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import {
  bulkPublishProgrammeResults,
  saveBasicProgrammeScoresAction,
} from "@/features/results/actions/results.actions";
import type { BasicScoreRow } from "@/features/results/services/basic-scoring.service";
import { getGradeBadgeColor } from "@/features/results/services/results-calculator";

type Assignment = {
  id: string;
  teamNumber: number;
  student?: { name: string; chestNumber?: string | null } | null;
  group?: { id: string; name: string } | null;
  result?: {
    points?: number | null;
    grade?: string | null;
    awardPoints?: number | null;
    isPublished?: boolean;
  } | null;
};

type Programme = {
  id: string;
  name: string;
  status: ProgrammeStatus;
  type: "INDIVIDUAL" | "GROUP";
  category: { id: string; name: string };
  assignments: Assignment[];
};

function teamKey(groupId: string, teamNumber: number) {
  return `${groupId}-${teamNumber}`;
}

function getTeamIdentifier(assignment: Assignment) {
  if (assignment.group) {
    return teamKey(assignment.group.id, assignment.teamNumber || 1);
  }
  return assignment.id;
}

function getTeamLabel(assignment: Assignment) {
  if (assignment.group) {
    const tn = assignment.teamNumber || 1;
    return `${assignment.group.name}${tn > 1 ? ` (Team ${tn})` : ""}`;
  }
  return assignment.student?.name ?? "Unknown";
}

function getProgrammeScoringProgress(prog: Programme) {
  const total =
    prog.type === "GROUP"
      ? new Set(prog.assignments.map((a) => getTeamIdentifier(a))).size
      : prog.assignments.length;
  const progress =
    prog.type === "GROUP"
      ? new Set(
          prog.assignments
            .filter((a) => a.result != null)
            .map((a) => getTeamIdentifier(a)),
        ).size
      : prog.assignments.filter((a) => a.result != null).length;
  const isPublished =
    prog.status === "PUBLISHED" || prog.status === "ANNOUNCED";
  const allHaveSavedResults =
    prog.assignments.length > 0 &&
    prog.assignments.every((a) => a.result != null);
  return { total, progress, isPublished, allHaveSavedResults };
}

export function BasicScoringClient({
  festival,
  programmes,
  children,
}: {
  festival: { id: string; slug: string; name: string };
  programmes: Programme[];
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { isReadOnly } = useFestivalReadOnly();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const canSwapPoster = !isReadOnly;

  const selected = useMemo(
    () => programmes.find((p) => p.id === selectedId) ?? null,
    [programmes, selectedId],
  );

  const openProgramme = (prog: Programme) => {
    const initial: Record<string, string> = {};
    if (prog.type === "GROUP") {
      const seen = new Set<string>();
      for (const a of prog.assignments) {
        const key = getTeamIdentifier(a);
        if (seen.has(key)) continue;
        seen.add(key);
        const pts = a.result?.points;
        if (pts != null) initial[key] = String(pts);
      }
    } else {
      for (const a of prog.assignments) {
        const pts = a.result?.points;
        if (pts != null) initial[a.id] = String(pts);
      }
    }
    setScores(initial);
    setSelectedId(prog.id);
  };

  const rosterRows = useMemo(() => {
    if (!selected) return [];
    if (selected.type === "INDIVIDUAL") {
      return selected.assignments.map((a) => ({
        key: a.id,
        label: a.student?.name ?? "Unknown",
        sub: a.student?.chestNumber ? `#${a.student.chestNumber}` : "",
        members: null as string | null,
        assignment: a,
      }));
    }
    const byTeam = new Map<
      string,
      { key: string; label: string; members: string[]; assignment: Assignment }
    >();
    for (const a of selected.assignments) {
      const key = getTeamIdentifier(a);
      const existing = byTeam.get(key);
      const name = a.student?.name ?? "Member";
      if (existing) {
        existing.members.push(name);
      } else {
        byTeam.set(key, {
          key,
          label: getTeamLabel(a),
          members: [name],
          assignment: a,
        });
      }
    }
    return Array.from(byTeam.values()).map((t) => ({
      key: t.key,
      label: t.label,
      sub: `Team ${t.assignment.teamNumber || 1}`,
      members: t.members.join(", "),
      assignment: t.assignment,
    }));
  }, [selected]);

  const scoredCount = useMemo(() => {
    if (!selected) return 0;
    return rosterRows.filter((r) => {
      const v = scores[r.key];
      return v !== undefined && v !== "" && !Number.isNaN(Number(v));
    }).length;
  }, [rosterRows, scores, selected]);

  const buildRows = (prog: Programme): BasicScoreRow[] => {
    if (prog.type === "INDIVIDUAL") {
      const rows: BasicScoreRow[] = [];
      for (const a of prog.assignments) {
        const raw = scores[a.id];
        if (raw === undefined || raw === "") continue;
        rows.push({
          kind: "assignment",
          assignmentId: a.id,
          points: Number(raw),
        });
      }
      return rows;
    }
    const seen = new Set<string>();
    const rows: BasicScoreRow[] = [];
    for (const a of prog.assignments) {
      const key = getTeamIdentifier(a);
      if (seen.has(key)) continue;
      seen.add(key);
      const raw = scores[key];
      if (raw === undefined || raw === "" || !a.group) continue;
      rows.push({
        kind: "team",
        groupId: a.group.id,
        teamNumber: a.teamNumber || 1,
        points: Number(raw),
      });
    }
    return rows;
  };

  const handleSave = () => {
    if (!selected || isReadOnly) return;
    const rows = buildRows(selected);
    if (rows.length === 0) {
      toast.error("Enter at least one score (0–100).");
      return;
    }
    startTransition(async () => {
      const res = await saveBasicProgrammeScoresAction({
        festivalId: festival.id,
        programmeId: selected.id,
        rows,
      });
      if (res.success) {
        toast.success(`Saved ${res.data.savedCount} score(s).`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handlePublish = (programmeId: string, publish: boolean) => {
    if (isReadOnly) return;
    setPublishingId(programmeId);
    startTransition(async () => {
      const res = await bulkPublishProgrammeResults(
        programmeId,
        publish,
        festival.slug,
      );
      setPublishingId(null);
      if (res.success) {
        toast.success(
          publish ? "Programme published." : "Programme unpublished.",
        );
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  if (selected) {
    const isPublished =
      selected.status === "PUBLISHED" || selected.status === "ANNOUNCED";
    const allHaveSavedResults =
      rosterRows.length > 0 &&
      rosterRows.every((r) => r.assignment.result != null);
    const canPublish = allHaveSavedResults && !isPublished;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedId(null)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            All programmes
          </Button>
          {children}
        </div>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-lg">{selected.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selected.category.name} ·{" "}
                {selected.type === "GROUP" ? "Team" : "Individual"}
              </p>
            </div>
            <ProgrammeStatusBadge status={selected.status} />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter points from 0–100. Grades and award points are calculated
              from your scoring policy.
            </p>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {selected.type === "GROUP" ? "Team" : "Participant"}
                    </TableHead>
                    <TableHead className="w-[120px]">Points</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Award pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rosterRows.map((row) => {
                    const result = row.assignment.result;
                    return (
                      <TableRow key={row.key}>
                        <TableCell>
                          <div className="font-medium">{row.label}</div>
                          {row.members ? (
                            <div className="text-xs text-muted-foreground">
                              {row.members}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              {row.sub}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            disabled={isReadOnly || isPending}
                            value={scores[row.key] ?? ""}
                            onChange={(e) =>
                              setScores((prev) => ({
                                ...prev,
                                [row.key]: e.target.value,
                              }))
                            }
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          {result?.grade ? (
                            <Badge
                              className={cn(
                                "font-semibold",
                                getGradeBadgeColor(result.grade),
                              )}
                            >
                              {result.grade}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {result?.awardPoints != null
                            ? result.awardPoints
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {scoredCount} / {rosterRows.length} scored
              </span>
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                disabled={isReadOnly || isPending}
                onClick={handleSave}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save scores
              </Button>
              {isPublished ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isReadOnly || isPending}
                  onClick={() => handlePublish(selected.id, false)}
                >
                  Unpublish
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isReadOnly || isPending || !canPublish}
                  onClick={() => handlePublish(selected.id, true)}
                  title={
                    !canPublish
                      ? "Save a score for every participant or team first"
                      : undefined
                  }
                >
                  {publishingId === selected.id && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Publish programme
                </Button>
              )}
            </div>

            {isPublished && (
              <ProgrammeResultPosterSection
                programmeId={selected.id}
                festivalSlug={festival.slug}
                canSwap={canSwapPoster}
                isPublished={isPublished}
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>{children}</div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/${festival.slug}/event-works/scoring`}>
            <Settings2 className="mr-2 h-4 w-4" />
            Scoring policy
          </Link>
        </Button>
      </div>

      {programmes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No programmes ready for scoring.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {programmes.map((prog) => {
            const { total, progress, isPublished, allHaveSavedResults } =
              getProgrammeScoringProgress(prog);
            const canPublish = allHaveSavedResults && !isPublished;
            const isPublishing = publishingId === prog.id;

            const scoreButtonLabel = allHaveSavedResults
              ? "Edit scores"
              : "Enter scores";

            return (
              <Card
                key={prog.id}
                className="flex flex-col transition-colors hover:bg-muted/40"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      {prog.name}
                    </CardTitle>
                    <ProgrammeStatusBadge status={prog.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {prog.category.name} ·{" "}
                    {prog.type === "GROUP" ? "Team" : "Individual"}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col pb-3">
                  <div className="flex items-center mb-1 justify-between text-sm text-muted-foreground">
                    <span>
                      {progress} / {total} scored
                    </span>
                    {isPublished && (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Published
                      </span>
                    )}
                  </div>
                  <div className="mt-auto border-t pt-3">
                    {isPublished ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={isReadOnly || isPending}
                        onClick={() => handlePublish(prog.id, false)}
                      >
                        {isPublishing && (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        )}
                        Unpublish
                      </Button>
                    ) : allHaveSavedResults ? (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openProgramme(prog)}
                        >
                          <ClipboardList className="mr-2 h-3.5 w-3.5" />
                          {scoreButtonLabel}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1"
                          disabled={isReadOnly || isPending || !canPublish}
                          onClick={() => handlePublish(prog.id, true)}
                        >
                          {isPublishing && (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          )}
                          Publish
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => openProgramme(prog)}
                      >
                        <ClipboardList className="mr-2 h-3.5 w-3.5" />
                        {scoreButtonLabel}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
