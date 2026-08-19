"use client";

import { ChevronRight, Loader2, Megaphone, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/core/utils/cn";
import {
  announceResult,
  announceStandings,
} from "@/features/announcement/actions/announcer.actions";
import type {
  AnnouncerQueueProgramme,
  PublishedResultProgramme,
  TeamStandingRow,
} from "@/features/announcement/services/announcer.service";
import { useLiveChannel } from "@/hooks/use-live-channel";
import { toast } from "@/lib/toast";

function QueueActionButton({
  children,
  variant = "default",
  onClick,
  disabled,
}: {
  children: ReactNode;
  variant?: "default" | "outline";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      size="sm"
      variant={variant}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-8 px-3 text-xs font-medium",
        variant === "default" &&
          "bg-violet-600 hover:bg-violet-700 text-white shadow-sm",
      )}
    >
      {children}
    </Button>
  );
}

interface AnnouncerClientProps {
  festivalId: string;
  festivalSlug: string;
  queue: AnnouncerQueueProgramme[];
  nextResultNumber: number;
  publishedResults: PublishedResultProgramme[];
  standingsContext: {
    publishedStandings: TeamStandingRow[];
    queuedTeamStandings: TeamStandingRow[];
    standingsPublishedAtResultNumber: number | null;
    standingsPublishedAt: string | null;
    standingsAnnouncedAt: string | null;
    highestPublishedResultNumber: number | null;
  };
}

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
export function AnnouncerClient({
  festivalId,
  queue,
  publishedResults,
  standingsContext,
}: AnnouncerClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeProgramme, setActiveProgramme] =
    useState<AnnouncerQueueProgramme | null>(null);

  const [queuePageIndex, setQueuePageIndex] = useState(0);
  const [publishedPageIndex, setPublishedPageIndex] = useState(0);
  const pageSize = 15;

  /* UC3 — score-events stream. The Stage Portal scoring client pushes
     `{ programmeId, judgeId, score, at }` here on every score submission;
     multiple judges might be marking the same programme concurrently.
     A fresh event means the *current* programme's marks panel may be
     stale — refresh the whole console so the announcer sees marks come
     in without manual reloads. Hook auto-reconnects on disconnect. The
     `activeProgramme` is whichever programme the announcer is currently
     marking for; null/empty means there's no live programme to watch. */
  const activeProgrammeId = activeProgramme?.id ?? "";
  const { data: scoreEvent, status: liveStatus } = useLiveChannel<{
    programmeId: string;
    judgeId: string;
    score: number | string;
    at: string;
  }>({
    url: `/api/v1/programmes/${activeProgrammeId || "0"}/score-events/stream`,
  });

  useEffect(() => {
    if (!scoreEvent) return;
    router.refresh();
  }, [scoreEvent, router]);

  /* Polling fallback. 15s cadence matches the pre-Issue-48 behaviour;
     suppressed when SSE is open so we don't double-refresh. */
  useEffect(() => {
    if (liveStatus === "open") return;
    const interval = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(interval);
  }, [router, liveStatus]);

  const sorted = useMemo(() => {
    return [...queue].sort((a, b) => {
      if (a.resultNumber == null && b.resultNumber == null) return 0;
      if (a.resultNumber == null) return 1;
      if (b.resultNumber == null) return -1;
      return a.resultNumber - b.resultNumber;
    });
  }, [queue]);

  function handleAnnounce(programme?: AnnouncerQueueProgramme) {
    const target = programme ?? activeProgramme;
    if (!target) return;
    startTransition(async () => {
      const res = await announceResult(festivalId, target.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Result #${target.resultNumber} announced — "${target.name}" is now live.`,
      );
      setActiveProgramme(null);
      router.refresh();
    });
  }

  const hasQueue = sorted.length > 0;
  const hasPublished = publishedResults && publishedResults.length > 0;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column (3/4) */}
        <div className="lg:col-span-3 space-y-8 order-2 lg:order-1">
          {!hasQueue && !hasPublished ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="py-12 text-center text-muted-foreground">
                <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15">
                  <Megaphone className="h-7 w-7 text-violet-500/60" />
                </span>
                <p className="font-medium">No programmes ready to announce</p>
                <p className="text-sm mt-1">
                  Programmes will appear here once judgement is complete.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Card-based Queue */}
              {hasQueue && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
                    </span>
                    Ready to Announce
                  </h2>
                  <div className="grid gap-3">
                    {sorted
                      .slice(
                        queuePageIndex * pageSize,
                        (queuePageIndex + 1) * pageSize,
                      )
                      .map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setActiveProgramme(p)}
                          className="group flex flex-row items-center justify-between gap-4 rounded-xl border bg-gradient-to-b from-card to-muted/20 p-4 shadow-sm transition-all hover:shadow-md hover:border-violet-500/30 overflow-hidden cursor-pointer"
                        >
                          <div className="flex items-center gap-4 min-w-0 pl-1">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-500/10 shadow-inner">
                              <span className="font-mono text-sm font-bold text-violet-600 dark:text-violet-400">
                                {p.resultNumber != null
                                  ? `#${p.resultNumber}`
                                  : "—"}
                              </span>
                            </div>
                            <div className="min-w-0 flex flex-col justify-center">
                              <p className="font-semibold text-foreground truncate text-base">
                                {p.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className="text-muted-foreground text-xs font-medium">
                                  {p.categoryName}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
                                  {p.type === "GROUP" ? "Group" : "Individual"}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
                                  {p.stageType === "NON_STAGE"
                                    ? "Offstage"
                                    : "Stage"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center shrink-0 pr-1">
                            <ChevronRight className="w-5 h-5 text-muted-foreground opacity-50 transition-opacity group-hover:opacity-100" />
                          </div>
                        </div>
                      ))}
                  </div>

                  {sorted.length > pageSize && (
                    <DataTablePagination
                      pageIndex={queuePageIndex}
                      pageCount={Math.ceil(sorted.length / pageSize)}
                      onPageChange={(page) => setQueuePageIndex(page)}
                      className="mt-4"
                    />
                  )}
                </div>
              )}

              {/* Published Results — compact cards */}
              {hasPublished && (
                <div className="mt-8 space-y-4 opacity-80 hover:opacity-100 transition-opacity">
                  <h2 className="text-lg font-semibold tracking-tight text-muted-foreground">
                    Announced Results
                  </h2>
                  <div className="grid gap-2">
                    {publishedResults
                      .slice(
                        publishedPageIndex * pageSize,
                        (publishedPageIndex + 1) * pageSize,
                      )
                      .map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-4 rounded-lg border bg-card/50 p-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs font-bold text-muted-foreground w-10 shrink-0">
                              {p.resultNumber != null
                                ? `#${p.resultNumber}`
                                : "—"}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-muted-foreground truncate">
                                {p.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-muted-foreground text-xs opacity-80">
                                  {p.categoryName}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 px-1.5 font-normal opacity-70"
                                >
                                  {p.type === "GROUP" ? "Group" : "Individual"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge
                              variant="outline"
                              className="text-muted-foreground opacity-80 text-[10px]"
                            >
                              Announced
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>

                  {publishedResults.length > pageSize && (
                    <DataTablePagination
                      pageIndex={publishedPageIndex}
                      pageCount={Math.ceil(publishedResults.length / pageSize)}
                      onPageChange={(page) => setPublishedPageIndex(page)}
                      className="mt-4"
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column (1/4) */}
        <div className="space-y-6 lg:col-span-1 order-1 lg:order-2">
          {standingsContext.queuedTeamStandings.length > 0 && (
            <Card className="border-violet-500/20 bg-violet-500/5 shadow-sm">
              <CardHeader className="py-4 border-b border-violet-500/10">
                <CardTitle className="text-sm font-semibold flex items-center justify-between text-violet-700 dark:text-violet-400">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Queued Standings
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="text-sm text-muted-foreground">
                  Standings updated after Result #
                  {standingsContext.standingsPublishedAtResultNumber} are
                  waiting to be announced.
                </div>
                <Button
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={() => {
                    startTransition(async () => {
                      const res = await announceStandings(festivalId);
                      if (!res.success) {
                        toast.error(res.error);
                        return;
                      }
                      toast.success("Standings announced successfully!");
                      router.refresh();
                    });
                  }}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Megaphone className="h-4 w-4 mr-2" />
                  )}
                  Announce Standings
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="border-0 ring-1 ring-border rounded-xl bg-card overflow-hidden shadow-sm sticky top-6">
            <div className="bg-muted/50 p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold tracking-tight flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Live Standings
              </h2>
              {standingsContext.standingsAnnouncedAt && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-normal bg-background"
                >
                  Updated
                </Badge>
              )}
            </div>

            <ScrollArea className="max-h-[400px]">
              {standingsContext.publishedStandings.length === 0 ? (
                <p className="text-sm text-muted-foreground p-6 text-center">
                  No standings published yet.
                </p>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 border-b shadow-sm">
                    <TableRow>
                      <TableHead className="w-16 pl-3">Place</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead className="text-right pr-3">Pts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standingsContext.publishedStandings.map((s) => (
                      <TableRow
                        key={s.name}
                        className={cn(MEDAL_ROWS[s.rank - 1])}
                      >
                        <TableCell className="pl-3 py-2">
                          <PlaceLabel rank={s.rank} />
                        </TableCell>
                        <TableCell className="font-semibold py-2 text-sm">
                          {s.name}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold pr-3 py-2 text-sm">
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

      {/* Announcer drawer */}
      <Drawer
        open={!!activeProgramme}
        onOpenChange={(open) => !open && setActiveProgramme(null)}
      >
        <DrawerContent>
          <div className="mx-auto w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {activeProgramme && (
              <>
                <DrawerHeader>
                  <DrawerTitle className="flex items-center gap-2">
                    {activeProgramme.resultNumber != null && (
                      <span className="inline-flex items-center justify-center rounded-lg bg-violet-500/10 px-2 py-0.5 font-mono text-sm font-bold text-violet-600 dark:text-violet-400">
                        #{activeProgramme.resultNumber}
                      </span>
                    )}
                    <span className="text-xl">{activeProgramme.name}</span>
                  </DrawerTitle>
                  <div className="flex items-center gap-2">
                    <DrawerDescription>
                      {activeProgramme.categoryName}
                    </DrawerDescription>
                    <Badge variant="outline" className="text-[10px]">
                      {activeProgramme.type === "GROUP"
                        ? "Group"
                        : "Individual"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {activeProgramme.stageType === "NON_STAGE"
                        ? "Offstage"
                        : "Stage"}
                    </Badge>
                  </div>
                </DrawerHeader>

                {/* Result roster */}
                <div className="space-y-2 py-4">
                  <p className="text-sm font-medium">Result Roster</p>
                  <div className="border rounded-xl shadow-sm overflow-hidden bg-card">
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="w-12">SI</TableHead>
                            <TableHead className="w-16">Code</TableHead>
                            <TableHead>Participant</TableHead>
                            <TableHead>Group</TableHead>
                            <TableHead className="w-16">Grade</TableHead>
                            <TableHead className="w-20">Prize</TableHead>
                            <TableHead className="w-20 text-right">
                              Award Pts
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
                                  r.position != null &&
                                    MEDAL_ROWS[r.position - 1],
                                )}
                              >
                                <TableCell className="text-muted-foreground font-mono">
                                  {idx + 1}
                                </TableCell>
                                <TableCell className="font-mono">
                                  {r.codeLetter ?? "—"}
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
                                <TableCell className="font-medium">
                                  {r.grade ?? "—"}
                                </TableCell>
                                <TableCell>
                                  {r.position === 1
                                    ? "🥇 1st"
                                    : r.position === 2
                                      ? "🥈 2nd"
                                      : r.position === 3
                                        ? "🥉 3rd"
                                        : "—"}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold">
                                  {r.awardPoints}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Mobile Cards View */}
                    <div className="block sm:hidden divide-y divide-border">
                      {activeProgramme.results
                        .sort(
                          (a, b) => (a.position ?? 999) - (b.position ?? 999),
                        )
                        .map((r, idx) => (
                          <div
                            key={r.id}
                            className={cn(
                              "p-4 flex flex-col gap-3",
                              r.position != null && MEDAL_ROWS[r.position - 1],
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground font-mono text-xs mt-0.5 w-4 shrink-0">
                                  {idx + 1}.
                                </span>
                                <span className="font-semibold text-sm">
                                  {r.participantName ?? "—"}
                                  {r.chestNumber && (
                                    <span className="text-xs text-muted-foreground ml-1 font-normal">
                                      ({r.chestNumber})
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {r.position != null && r.position <= 3 ? (
                                  <span className="font-bold text-sm flex items-center gap-1">
                                    {r.position === 1
                                      ? "🥇"
                                      : r.position === 2
                                        ? "🥈"
                                        : "🥉"}
                                    <span
                                      className={
                                        r.position === 1
                                          ? "text-amber-600 dark:text-amber-400"
                                          : r.position === 2
                                            ? "text-slate-500 dark:text-slate-300"
                                            : "text-orange-600 dark:text-orange-400"
                                      }
                                    >
                                      {r.position === 1
                                        ? "1st"
                                        : r.position === 2
                                          ? "2nd"
                                          : "3rd"}
                                    </span>
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-6 text-xs text-muted-foreground">
                              {r.codeLetter && (
                                <div className="flex items-center gap-1">
                                  <span className="opacity-70">Code:</span>
                                  <span className="font-mono text-foreground font-medium">
                                    {r.codeLetter}
                                  </span>
                                </div>
                              )}
                              {r.groupName && (
                                <div className="flex items-center gap-1">
                                  <span className="opacity-70">Group:</span>
                                  <span className="font-medium text-foreground">
                                    {r.groupName}
                                  </span>
                                </div>
                              )}
                              {r.grade && (
                                <div className="flex items-center gap-1">
                                  <span className="opacity-70">Grade:</span>
                                  <span className="font-medium text-foreground">
                                    {r.grade}
                                  </span>
                                </div>
                              )}
                              {r.awardPoints != null && r.awardPoints > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="opacity-70">Points:</span>
                                  <span className="font-mono font-bold text-foreground">
                                    {r.awardPoints}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                <DrawerFooter className="flex-col sm:flex-row gap-2 px-4 pb-8 pt-4">
                  <p className="text-xs text-muted-foreground flex-1">
                    {activeProgramme.resultNumber != null
                      ? `This publishes result #${activeProgramme.resultNumber} to the public site and generates the poster.`
                      : "Assign a result number first."}
                  </p>
                  <Button
                    onClick={() => handleAnnounce()}
                    size="lg"
                    disabled={isPending || activeProgramme.resultNumber == null}
                    className="relative overflow-hidden font-bold bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    {isPending ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Megaphone className="h-5 w-5 mr-2" />
                    )}
                    Announce{" "}
                    {activeProgramme.resultNumber != null
                      ? `#${activeProgramme.resultNumber}`
                      : ""}
                  </Button>
                </DrawerFooter>
                {activeProgramme.resultNumber == null && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 px-4 pb-6">
                    No result number assigned.
                  </p>
                )}
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
