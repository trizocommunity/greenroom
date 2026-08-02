"use client";

import {
  ChevronRight,
  Filter,
  ListChecks,
  Medal,
  Search,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/core/utils/cn";
import { publishProgrammeToDesk } from "@/features/announcement/actions/announcement.actions";
import { bulkPublishProgrammeResults } from "@/features/results/actions/results.actions";
import { getGradeBadgeColor } from "@/features/results/services/results-calculator";

const getTeamIdentifier = (assignment: any, type: string) => {
  if (type === "GROUP") {
    const groupKey =
      assignment.group?.id ?? assignment.group?.name ?? "no-group";
    const teamNum = assignment.teamNumber || 1;
    return `${groupKey}-${teamNum}`;
  }
  return assignment.id;
};

type Programme = {
  id: string;
  name: string;
  type: string;
  category: { id: string; name: string };
  assignments: any[];
};

const getResultPoints = (result: {
  points?: number;
  awardPoints?: number | null;
}) => result.awardPoints ?? result.points ?? 0;

interface ResultsExploreClientProps {
  festival: { id: string; name: string; slug: string };
  programmes: Programme[];
  categories: { id: string; name: string }[];
  initialProgrammeId?: string;
  festivalRole?: string;
  children?: React.ReactNode;
}

export function ResultsExploreClient({
  festival,
  programmes,
  categories,
  initialProgrammeId,
  festivalRole,
  children,
}: ResultsExploreClientProps) {
  const isAnnouncerOnly = festivalRole === "ANNOUNCER";
  const canUnpublish = festivalRole !== "ANNOUNCER";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [publishingProgrammeId, setPublishingProgrammeId] = useState<
    string | null
  >(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewProgramme, setViewProgramme] = useState<Programme | null>(null);

  // Polling refresh every 15 seconds for updates
  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, 15000);
    return () => window.clearInterval(id);
  }, [router]);

  const programmesWithResults = useMemo(() => {
    return programmes
      .map((p) => {
        const assignmentsWithResult = p.assignments.filter(
          (a: any) => a.result,
        );

        let totalResults = assignmentsWithResult.length;
        let publishedCount = assignmentsWithResult.filter(
          (a: any) => a.result?.isPublished,
        ).length;
        let announcedCount = assignmentsWithResult.filter(
          (a: any) => a.result?.isAnnounced,
        ).length;

        if (p.type === "GROUP") {
          const allTeams = new Set<string>();
          const publishedTeams = new Set<string>();
          const announcedTeams = new Set<string>();

          assignmentsWithResult.forEach((a: any) => {
            const teamId = getTeamIdentifier(a, "GROUP");
            allTeams.add(teamId);
            if (a.result?.isPublished) publishedTeams.add(teamId);
            if (a.result?.isAnnounced) announcedTeams.add(teamId);
          });

          totalResults = allTeams.size;
          publishedCount = publishedTeams.size;
          announcedCount = announcedTeams.size;
        }

        const hasAnyResult = totalResults > 0;
        const isPublished = hasAnyResult && publishedCount === totalResults;
        const isAnnounced = hasAnyResult && announcedCount === totalResults;

        return {
          ...p,
          _meta: {
            hasAnyResult,
            publishedCount,
            announcedCount,
            totalResults,
            isPublished,
            isAnnounced,
          },
        };
      })
      .filter((p) => p._meta.hasAnyResult);
  }, [programmes]);

  const filteredProgrammes = useMemo(() => {
    let list = programmesWithResults;
    if (filterCategory !== "all") {
      list = list.filter((p) => p.category.id === filterCategory);
    }
    if (filterType !== "all") {
      list = list.filter((p) => p.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category?.name || "").toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => {
      // Unpublished first (auto prioritize for workflow)
      if (a._meta.isPublished !== b._meta.isPublished) {
        return a._meta.isPublished ? 1 : -1;
      }
      if (b._meta.totalResults !== a._meta.totalResults) {
        return b._meta.totalResults - a._meta.totalResults;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }, [programmesWithResults, filterCategory, filterType, searchQuery]);

  useEffect(() => {
    if (!initialProgrammeId) return;
    const targetProgramme = programmesWithResults.find(
      (programme) => programme.id === initialProgrammeId,
    );
    if (!targetProgramme) return;

    setFilterCategory("all");
    setFilterType("all");
    setSearchQuery(targetProgramme.name);
    setViewProgramme(targetProgramme as Programme);
  }, [initialProgrammeId, programmesWithResults]);

  const togglePublishProgramme = (programmeId: string, publish: boolean) => {
    if (!publish && !canUnpublish) return;
    setPublishingProgrammeId(programmeId);
    startTransition(async () => {
      try {
        if (isAnnouncerOnly && publish) {
          const response = await publishProgrammeToDesk(
            festival.id,
            programmeId,
          );
          if (!response.success) {
            toast.error(response.error ?? "Failed to publish to desk");
            return;
          }
          if (response.data?.resumedResultsBatch) {
            toast.info("Public site resumed programme results display");
          }
          toast.success("Results published to announcement desk");
        } else {
          const response = await bulkPublishProgrammeResults(
            programmeId,
            publish,
            festival.slug,
          );
          if (!response.success) {
            toast.error("Failed to update publish state");
            return;
          }
          toast.success(
            publish
              ? "Results published to announcement desk"
              : "Results unpublished",
          );
        }
        router.refresh();
      } finally {
        setPublishingProgrammeId(null);
      }
    });
  };

  const viewDetailsRows = useMemo(() => {
    if (!viewProgramme) return [];

    if (viewProgramme.type === "GROUP") {
      const teamMap = new Map<string, any>();
      viewProgramme.assignments.forEach((assignment: any) => {
        if (!assignment.result) return;
        const teamId = getTeamIdentifier(assignment, "GROUP");
        if (!teamMap.has(teamId)) {
          const participantAndTeam = `${assignment.participant?.name || "Unknown"} and team`;
          const groupName = assignment.group?.name || "";
          teamMap.set(teamId, {
            assignmentId: assignment.id,
            displayName: participantAndTeam,
            subText: groupName,
            chestNumber: "",
            codeLetter: assignment.result?.codeLetter?.code ?? "-",
            isAbsent: assignment.result?.codeLetter?.isAbsent ?? false,
            grade: assignment.result.grade,
            points: getResultPoints(assignment.result),
            position: assignment.result.position || 0,
            remarks: assignment.result.remarks,
          });
        }
      });
      return Array.from(teamMap.values()).sort((a: any, b: any) => {
        if (a.position && b.position) return a.position - b.position;
        return (b.points || 0) - (a.points || 0);
      });
    }

    const details = viewProgramme.assignments
      .filter((a: any) => a.result != null)
      .map((assignment: any) => {
        const result = assignment.result!;
        return {
          assignmentId: assignment.id,
          displayName: assignment.participant?.name || "Unknown",
          subText: "",
          chestNumber: assignment.participant?.chestNumber
            ? `#${assignment.participant.chestNumber}`
            : "",
          codeLetter: result.codeLetter?.code ?? "-",
          isAbsent: result.codeLetter?.isAbsent ?? false,
          grade: result.grade,
          points: getResultPoints(result),
          position: result.position || 0,
          remarks: result.remarks,
        };
      });
    return details.sort((a: any, b: any) => {
      if (a.position && b.position) return a.position - b.position;
      return (b.points || 0) - (a.points || 0);
    });
  }, [viewProgramme]);

  const hasFilters =
    filterCategory !== "all" ||
    filterType !== "all" ||
    searchQuery.trim() !== "";
  const clearFilters = () => {
    setFilterCategory("all");
    setFilterType("all");
    setSearchQuery("");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-4">
        {children ?? (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Results
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
              Explore published results by programme.
            </p>
          </div>
        )}
      </div>

      {/* Filter bar – clearly distinct from result cards (toolbar style) */}
      <div className="rounded-xl border-2 border-primary/20 bg-primary/5 shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/10 bg-primary/10">
          <Filter className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground">Filters</span>
          <span className="text-xs text-muted-foreground ml-1">
            ({filteredProgrammes.length} programme
            {filteredProgrammes.length !== 1 ? "s" : ""})
          </span>
        </div>
        <div className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <div className="relative w-full sm:w-auto sm:min-w-[180px] sm:max-w-[220px] order-first">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search programme or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full pl-8 text-sm"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 w-full sm:w-[160px] text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9 w-full sm:w-[120px] text-sm">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="GROUP">Group</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-full sm:w-9 shrink-0"
                onClick={clearFilters}
                title="Clear filters"
              >
                <X className="h-3.5 w-3.5 sm:mr-0" />
                <span className="sm:hidden">Clear filters</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Result cards – visually different from filter (content cards) */}
      {filteredProgrammes.length === 0 ? (
        <Card className="rounded-xl border border-dashed bg-muted/10">
          <CardContent className="py-16 text-center">
            <ListChecks className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No published programmes found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProgrammes.map((prog) => (
            <Card
              key={prog.id}
              className={cn(
                "group cursor-pointer overflow-hidden rounded-xl border border-border/80 transition-all hover:border-primary/30 hover:shadow-lg",
                viewProgramme?.id === prog.id &&
                  "ring-2 ring-primary/60 border-primary/50 shadow-lg",
              )}
              onClick={() => setViewProgramme(prog)}
            >
              <div className="px-4 py-3 flex items-center gap-2 bg-muted/25 border-b border-border/50">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground truncate">
                    {prog.category.name}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  {prog.id === initialProgrammeId ? (
                    <Badge className="text-[10px]">From Judgement</Badge>
                  ) : null}
                  <Badge variant="outline" className="text-[10px]">
                    {prog.type === "GROUP" ? "Group" : "Individual"}
                  </Badge>
                  {(canUnpublish || !prog._meta.isPublished) && (
                    <Button
                      size="sm"
                      variant={prog._meta.isPublished ? "outline" : "default"}
                      className="h-6 text-[10px] px-2.5 min-w-0"
                      disabled={isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePublishProgramme(
                          prog.id,
                          !prog._meta.isPublished,
                        );
                      }}
                    >
                      {publishingProgrammeId === prog.id
                        ? "Updating..."
                        : prog._meta.isPublished
                          ? canUnpublish
                            ? "Unpublish"
                            : "On desk"
                          : "Publish to desk"}
                    </Button>
                  )}
                  {prog._meta.isAnnounced ? (
                    <Badge className="text-[10px] bg-emerald-500/15 text-emerald-800">
                      Announced
                    </Badge>
                  ) : null}
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base leading-snug line-clamp-2 text-foreground">
                      {prog.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {prog._meta.publishedCount}/{prog._meta.totalResults}{" "}
                      result slots on desk
                      {prog._meta.announcedCount > 0
                        ? ` · ${prog._meta.announcedCount} on-air`
                        : ""}
                    </p>
                  </div>
                  <div className="rounded-full p-1.5 bg-muted/40 group-hover:bg-primary/10 transition-colors">
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!viewProgramme}
        onOpenChange={(open) => !open && setViewProgramme(null)}
      >
        <DialogContent className="w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-4xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto p-3 sm:p-6 rounded-lg sm:rounded-xl text-left">
          <DialogHeader className="text-left pr-8 sm:pr-0 space-y-1.5">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-xl truncate">
              <Medal className="w-5 h-5 shrink-0 text-primary" />
              {viewProgramme?.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {viewProgramme?.category.name} · {viewProgramme?.type} programme
            </DialogDescription>
          </DialogHeader>
          {viewDetailsRows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No results for this programme.
            </div>
          ) : (
            <>
              {/* Mobile: result cards */}
              <div className="mt-4 space-y-3 md:hidden">
                {viewDetailsRows.map((row: any, index: number) => (
                  <div
                    key={row.assignmentId}
                    className={cn(
                      "rounded-xl border p-3 sm:p-4 bg-card",
                      index < 3 && "border-primary/20 bg-primary/5",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground truncate">
                          {row.displayName}
                        </div>
                        {(row.chestNumber ||
                          row.subText ||
                          row.codeLetter !== "-") && (
                          <div className="text-xs text-muted-foreground truncate">
                            {row.codeLetter !== "-"
                              ? `Code ${row.codeLetter} · `
                              : ""}
                            {row.chestNumber} {row.subText}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {row.position > 0 && (
                          <span
                            className={cn(
                              "text-lg font-bold tabular-nums",
                              row.position === 1 && "text-yellow-600",
                              row.position === 2 && "text-gray-500",
                              row.position === 3 && "text-amber-700",
                            )}
                          >
                            #{row.position}
                          </span>
                        )}
                        {row.isAbsent ? (
                          <Badge
                            variant="destructive"
                            className="font-mono font-semibold"
                          >
                            Absent
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono font-semibold",
                              getGradeBadgeColor(row.grade),
                            )}
                          >
                            {row.grade}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge
                        variant="secondary"
                        className="font-mono font-semibold"
                      >
                        {row.points} pts
                      </Badge>
                      {row.remarks && row.remarks !== "-" && (
                        <span className="text-muted-foreground text-xs line-clamp-2">
                          {row.remarks}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="mt-4 hidden md:block overflow-x-auto -mx-2 px-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>
                        {viewProgramme?.type === "GROUP"
                          ? "Team"
                          : "Chest & Name"}
                      </TableHead>
                      <TableHead className="text-center">Code</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-center">Points</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewDetailsRows.map((row: any) => (
                      <TableRow key={row.assignmentId}>
                        <TableCell className="font-semibold">
                          {row.position > 0 ? (
                            <div className="flex items-center gap-1">
                              {row.position === 1 && (
                                <span className="text-yellow-500">🥇</span>
                              )}
                              {row.position === 2 && (
                                <span className="text-gray-400">🥈</span>
                              )}
                              {row.position === 3 && (
                                <span className="text-amber-700">🥉</span>
                              )}
                              <span>{row.position}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{row.displayName}</div>
                          {(row.chestNumber ||
                            row.subText ||
                            row.codeLetter !== "-") && (
                            <div className="text-xs text-muted-foreground">
                              {row.chestNumber} {row.subText}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">
                            {row.codeLetter}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {row.isAbsent ? (
                            <Badge
                              variant="destructive"
                              className="font-mono font-semibold"
                            >
                              Absent
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-mono font-semibold",
                                getGradeBadgeColor(row.grade),
                              )}
                            >
                              {row.grade}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className="font-mono font-semibold"
                          >
                            {row.points} pts
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {row.remarks || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
