"use client";

import {
  ArrowDownUp,
  Eye,
  Loader2,
  Megaphone,
  MoreVertical,
  Search,
  Sparkles,
  Trophy,
  Undo2,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/core/utils/cn";
import {
  publishStandings,
  swapResultNumbers,
  unpublishResult,
} from "@/features/announcement/actions/announcer.actions";
import type {
  PublishedResultProgramme,
  TeamStandingRow,
} from "@/features/announcement/services/announcer.service";

interface ResultsConsoleClientProps {
  festivalId: string;
  festivalSlug: string;
  published: PublishedResultProgramme[];
  liveStandings: TeamStandingRow[];
  standingsContext: {
    publishedStandings: TeamStandingRow[];
    standingsPublishedAtResultNumber: number | null;
    standingsPublishedAt: string | null;
    highestPublishedResultNumber: number | null;
  };
  canUnpublish: boolean;
  statusCounts?: Record<string, number>;
}

const STATUS_PILLS = [
  {
    label: "Pending",
    key: "PENDING_JUDGMENT",
    dot: "bg-slate-400",
    active: "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-slate-500/20",
  },
  {
    label: "In Progress",
    key: "JUDGING",
    dot: "bg-sky-500",
    active: "bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-500/20",
  },
  {
    label: "Submitted",
    key: "PENDING_PUBLICATION",
    dot: "bg-amber-500",
    active: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  },
] as const;

const MEDAL_ROWS = [
  "bg-amber-500/10",
  "bg-slate-400/10",
  "bg-orange-500/10",
] as const;

function PlaceLabel({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
        <span className="text-lg">🥇</span> 1st
      </span>
    );
  if (rank === 2)
    return (
      <span className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-300">
        <span className="text-lg">🥈</span> 2nd
      </span>
    );
  if (rank === 3)
    return (
      <span className="flex items-center gap-1.5 font-bold text-orange-600 dark:text-orange-400">
        <span className="text-lg">🥉</span> 3rd
      </span>
    );
  return <span className="pl-6 text-muted-foreground">{rank}th</span>;
}

export function ResultsConsoleClient({
  festivalId,
  festivalSlug,
  published,
  liveStandings,
  standingsContext,
  canUnpublish,
  statusCounts = {},
}: ResultsConsoleClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeProgramme, setActiveProgramme] =
    useState<PublishedResultProgramme | null>(null);
  const [standingsScope, setStandingsScope] = useState<"published" | "all">(
    "published",
  );
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(interval);
  }, [router]);

  const sorted = useMemo(
    () =>
      [...published].sort((a, b) => {
        if (a.resultNumber == null && b.resultNumber == null) return 0;
        if (a.resultNumber == null) return 1;
        if (b.resultNumber == null) return -1;
        return b.resultNumber - a.resultNumber;
      }),
    [published],
  );

  const filteredSorted = useMemo(() => {
    if (!searchQuery) return sorted;
    const lower = searchQuery.toLowerCase();
    return sorted.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        (p.categoryName ?? "").toLowerCase().includes(lower)
    );
  }, [sorted, searchQuery]);

  const displayStandings =
    standingsScope === "published" ? liveStandings : liveStandings;

  const newResultsSinceStandings =
    standingsContext.highestPublishedResultNumber != null &&
    standingsContext.standingsPublishedAtResultNumber != null
      ? published.filter(
          (p) =>
            p.resultNumber != null &&
            p.resultNumber >
              standingsContext.standingsPublishedAtResultNumber!,
        ).length
      : null;

  function handleUnpublish(programmeId: string) {
    startTransition(async () => {
      const res = await unpublishResult(festivalId, programmeId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Result unpublished — moved back to Announcer.");
      setActiveProgramme(null);
      router.refresh();
    });
  }

  function handleSwapNumbers(programmeIdA: string, programmeIdB: string) {
    startTransition(async () => {
      const res = await swapResultNumbers(
        festivalId,
        programmeIdA,
        programmeIdB,
      );
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Result numbers swapped.");
      setSwapTarget(null);
      setActiveProgramme(null);
      router.refresh();
    });
  }

  function handlePublishStandings() {
    startTransition(async () => {
      const res = await publishStandings(festivalId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Standings published to the public site.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full">
          {STATUS_PILLS.map((pill) => (
            <div
              key={pill.label}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ring-1 whitespace-nowrap",
                pill.active,
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", pill.dot)} />
              <span>{pill.label}</span>
              <span className="text-xs font-bold opacity-70">
                {statusCounts[pill.key] ?? 0}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ring-1 whitespace-nowrap bg-green-500/10 text-green-600 dark:text-green-400 ring-green-500/25">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Published</span>
            <span className="rounded-full bg-green-500/20 px-1.5 text-xs font-bold">
              {published.length}
            </span>
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap font-medium">
            After {standingsContext.standingsPublishedAtResultNumber ?? 0}
          </span>
          <Button
            size="sm"
            className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-md shadow-rose-500/25"
            disabled={isPending || standingsScope === "all"}
            onClick={handlePublishStandings}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Megaphone className="h-4 w-4 mr-2" />
            )}
            Publish Group Points
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Section 1 — Published Results Table */}
        <div className="lg:col-span-3 space-y-4 flex flex-col">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search results..."
                className="pl-9 h-9 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {newResultsSinceStandings != null && newResultsSinceStandings > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25">
                <Sparkles className="h-3 w-3" />
                {newResultsSinceStandings} new result{newResultsSinceStandings > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {filteredSorted.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15">
                  <Trophy className="h-7 w-7 text-violet-500/60" />
                </span>
                <p className="font-medium">No results found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border-0 ring-1 ring-border rounded-xl bg-card flex-1 overflow-hidden shadow-lg shadow-black/[0.03]">
              <Table>
                <TableHeader className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/5">
                  <TableRow>
                    <TableHead className="w-16 font-semibold text-foreground">#</TableHead>
                    <TableHead className="font-semibold text-foreground">Competition</TableHead>
                    <TableHead className="w-28 font-semibold text-foreground">Status</TableHead>
                    <TableHead className="w-16 text-right font-semibold text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSorted.map((p) => (
                    <TableRow key={p.id} className="hover:bg-violet-500/[0.04]">
                      <TableCell>
                        <span className="inline-flex items-center justify-center rounded-lg bg-violet-500/10 px-2 py-1 font-mono text-xs font-bold text-violet-600 dark:text-violet-400">
                          {p.resultNumber != null ? `#${p.resultNumber}` : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {p.categoryName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="bg-green-500/10 text-green-600 dark:text-green-400 ring-1 ring-green-500/25 border-0 shadow-none font-medium"
                        >
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500" />
                          Published
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setActiveProgramme(p)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canUnpublish && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleUnpublish(p.id)}
                              >
                                <Undo2 className="h-4 w-4 mr-2" />
                                Unpublish
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Section 2 — Leaderboard Sidebar */}
        <div className="lg:col-span-2">
          <div className="border-0 ring-1 ring-emerald-500/20 rounded-xl bg-card overflow-hidden flex flex-col shadow-lg shadow-emerald-500/5" style={{ maxHeight: "calc(100vh - 200px)" }}>
            <div className="p-3 border-b border-emerald-500/10 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-teal-500/5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
                  <Trophy className="h-3.5 w-3.5" />
                </span>
                <Select
                  value={standingsScope}
                  onValueChange={(v) =>
                    setStandingsScope(v as "published" | "all")
                  }
                >
                  <SelectTrigger className="h-8 w-fit min-w-[160px] font-semibold border-none shadow-none focus:ring-0 px-2 hover:bg-accent/50 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">
                      Published Results
                    </SelectItem>
                    <SelectItem value="all">All Results</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="flex-1 overflow-auto">
              {displayStandings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No standings data yet.
                </p>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 border-b shadow-sm">
                    <TableRow>
                      <TableHead className="w-24 pl-4">Place</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead className="w-24 text-right pr-4">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayStandings.map((s) => (
                      <TableRow
                        key={s.name}
                        className={cn(MEDAL_ROWS[s.rank - 1])}
                      >
                        <TableCell className="pl-4">
                          <PlaceLabel rank={s.rank} />
                        </TableCell>
                        <TableCell className="font-semibold">
                          {s.name}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold pr-4">
                          {s.points}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Result detail drawer */}
      <Dialog
        open={!!activeProgramme}
        onOpenChange={(open) => {
          if (!open) {
            setActiveProgramme(null);
            setSwapTarget(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {activeProgramme && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {activeProgramme.resultNumber != null && (
                    <span className="inline-flex items-center justify-center rounded-lg bg-violet-500/10 px-2 py-0.5 font-mono text-sm font-bold text-violet-600 dark:text-violet-400">
                      #{activeProgramme.resultNumber}
                    </span>
                  )}
                  <span>{activeProgramme.name}</span>
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {activeProgramme.categoryName}
                    <Badge variant="outline" className="text-[10px]">
                      {activeProgramme.type}
                    </Badge>
                  </div>
                </DialogDescription>
              </DialogHeader>

              {/* Published info */}
              <p className="text-xs text-muted-foreground">
                Published
                {activeProgramme.publishedByName
                  ? ` by ${activeProgramme.publishedByName}`
                  : ""}
                {activeProgramme.publishedAt
                  ? ` on ${new Date(activeProgramme.publishedAt).toLocaleString()}`
                  : ""}
              </p>

              {/* Result roster */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Result Roster</p>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-12">SI</TableHead>
                        <TableHead>Participant</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead className="w-16">Grade</TableHead>
                        <TableHead className="w-16">Prize</TableHead>
                        <TableHead className="w-16 text-right">
                          Points
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeProgramme.results
                        .sort(
                          (a, b) =>
                            (a.position ?? 999) - (b.position ?? 999),
                        )
                        .map((r, idx) => (
                          <TableRow
                            key={r.id}
                            className={cn(
                              r.position != null && MEDAL_ROWS[r.position - 1],
                            )}
                          >
                            <TableCell className="text-muted-foreground">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-medium">
                              {r.participantName ?? "—"}
                              {r.chestNumber && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({r.chestNumber})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {r.groupName ?? "—"}
                            </TableCell>
                            <TableCell>{r.grade ?? "—"}</TableCell>
                            <TableCell>
                              {r.position === 1
                                ? "🥇 1st"
                                : r.position === 2
                                  ? "🥈 2nd"
                                  : r.position === 3
                                    ? "🥉 3rd"
                                    : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {r.points}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Swap result number */}
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <ArrowDownUp className="h-3.5 w-3.5" />
                  Swap Result Number
                </p>
                <div className="flex items-center gap-2">
                  <Select
                    value={swapTarget ?? ""}
                    onValueChange={(v) => setSwapTarget(v || null)}
                  >
                    <SelectTrigger className="h-8 w-60 text-xs">
                      <SelectValue placeholder="Select a result to swap with" />
                    </SelectTrigger>
                    <SelectContent>
                      {published
                        .filter((p) => p.id !== activeProgramme.id && p.resultNumber != null)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            #{p.resultNumber} — {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!swapTarget || isPending}
                    onClick={() =>
                      swapTarget &&
                      handleSwapNumbers(activeProgramme.id, swapTarget)
                    }
                  >
                    Swap
                  </Button>
                </div>
              </div>

              <DialogFooter>
                {canUnpublish && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleUnpublish(activeProgramme.id)}
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Undo2 className="h-3.5 w-3.5 mr-1" />
                    )}
                    Unpublish
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
