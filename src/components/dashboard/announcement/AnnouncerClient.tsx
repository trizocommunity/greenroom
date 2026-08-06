"use client";

import { CheckCircle2, Loader2, Megaphone, Trophy, Star, Award } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { announceResult } from "@/features/announcement/actions/announcer.actions";
import type {
  AnnouncerQueueProgramme,
  PublishedResultProgramme,
  TeamStandingRow,
  ParticipantTopScorerRow,
} from "@/features/announcement/services/announcer.service";
import { toast } from "@/lib/toast";

interface AnnouncerClientProps {
  festivalId: string;
  festivalSlug: string;
  queue: AnnouncerQueueProgramme[];
  nextResultNumber: number;
  publishedResults: PublishedResultProgramme[];
  vocalOfTheFest: ParticipantTopScorerRow | null;
  penOfTheFest: ParticipantTopScorerRow | null;
  liveStandings: TeamStandingRow[];
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
  vocalOfTheFest,
  penOfTheFest,
  liveStandings,
}: AnnouncerClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeProgramme, setActiveProgramme] =
    useState<AnnouncerQueueProgramme | null>(null);

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(interval);
  }, [router]);

  const sorted = useMemo(() => {
    return [...queue].sort((a, b) => {
      if (a.resultNumber == null && b.resultNumber == null) return 0;
      if (a.resultNumber == null) return 1;
      if (b.resultNumber == null) return -1;
      return a.resultNumber - b.resultNumber;
    });
  }, [queue]);

  function handleAnnounce() {
    if (!activeProgramme) return;
    startTransition(async () => {
      const res = await announceResult(festivalId, activeProgramme.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Result #${activeProgramme.resultNumber} announced — "${activeProgramme.name}" is now live.`,
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
        <div className="lg:col-span-3 space-y-8">
          
          {/* Top Scorers Cards */}
          {(vocalOfTheFest || penOfTheFest) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vocalOfTheFest && (
                <Card className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 border-violet-500/20 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-violet-700 dark:text-violet-400">
                      <Star className="h-4 w-4" />
                      Vocal of the Fest
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-lg">{vocalOfTheFest.name}</p>
                        <p className="text-sm text-muted-foreground">{vocalOfTheFest.groupName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-lg text-violet-600 dark:text-violet-400">
                          {vocalOfTheFest.stagePoints}
                        </p>
                        <p className="text-xs text-muted-foreground">pts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {penOfTheFest && (
                <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700 dark:text-blue-400">
                      <Award className="h-4 w-4" />
                      Pen of the Fest
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-lg">{penOfTheFest.name}</p>
                        <p className="text-sm text-muted-foreground">{penOfTheFest.groupName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-lg text-blue-600 dark:text-blue-400">
                          {penOfTheFest.offstagePoints}
                        </p>
                        <p className="text-xs text-muted-foreground">pts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

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
              {/* List view for Queue */}
              {hasQueue && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
                    </span>
                    Ready to Announce
                  </h2>
                  <div className="border-0 ring-1 ring-border rounded-xl bg-card overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-20 font-semibold">#</TableHead>
                          <TableHead className="font-semibold">Programme</TableHead>
                          <TableHead className="w-24 font-semibold">Status</TableHead>
                          <TableHead className="w-24 text-right font-semibold">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sorted.map((p) => (
                          <TableRow key={p.id} className="hover:bg-violet-500/[0.02]">
                            <TableCell>
                              <span className="inline-flex items-center justify-center rounded-lg bg-violet-500/10 px-2 py-1 font-mono text-xs font-bold text-violet-600 dark:text-violet-400">
                                {p.resultNumber != null ? `#${p.resultNumber}` : "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium">{p.name}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-muted-foreground text-xs">
                                    {p.categoryName}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 px-1.5 font-normal"
                                  >
                                    {p.type === "GROUP" ? "Group" : "Individual"}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 px-1.5 font-normal"
                                  >
                                    {p.stageType === "NON_STAGE" ? "Offstage" : "Stage"}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="bg-green-500/10 text-green-600 dark:text-green-400 ring-1 ring-green-500/25 border-0 font-medium"
                              >
                                Ready
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                                onClick={() =>
                                  setActiveProgramme(p as AnnouncerQueueProgramme)
                                }
                              >
                                Open
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Published Results Section */}
              {hasPublished && (
                <div className="mt-8 space-y-4 opacity-80 hover:opacity-100 transition-opacity">
                  <h2 className="text-lg font-semibold tracking-tight text-muted-foreground">
                    Announced Results
                  </h2>
                  <div className="border rounded-xl bg-card/50 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="w-20">#</TableHead>
                          <TableHead>Programme</TableHead>
                          <TableHead className="w-24">Status</TableHead>
                          <TableHead className="w-40 text-right">
                            Announced By
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {publishedResults.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              <span className="font-mono text-xs font-bold text-muted-foreground">
                                {p.resultNumber != null ? `#${p.resultNumber}` : "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium text-muted-foreground">
                                  {p.name}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
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
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-muted-foreground opacity-80"
                              >
                                Announced
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {p.publishedByName ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column (1/4) - Team Standings */}
        <div className="lg:col-span-1">
          <div
            className="border-0 ring-1 ring-emerald-500/20 rounded-xl bg-card overflow-hidden flex flex-col shadow-lg shadow-emerald-500/5 sticky top-6"
            style={{ maxHeight: "calc(100vh - 48px)" }}
          >
            <div className="p-3 border-b border-emerald-500/10 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-teal-500/5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
                  <Trophy className="h-3.5 w-3.5" />
                </span>
                <span className="font-bold text-sm">Team Standings</span>
              </div>
            </div>

            <ScrollArea className="flex-1 overflow-auto">
              {liveStandings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No standings data.
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
                    {liveStandings.map((s) => (
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
                <div className="space-y-2 py-2 px-4">
                  <p className="text-sm font-medium">Result Roster</p>
                  <div className="border rounded-xl overflow-x-auto shadow-sm">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="w-12">SI</TableHead>
                          <TableHead className="w-16">Code</TableHead>
                          <TableHead>Participant</TableHead>
                          <TableHead>Group</TableHead>
                          <TableHead className="w-16">Grade</TableHead>
                          <TableHead className="w-20">Prize</TableHead>
                          <TableHead className="w-16 text-right">
                            Points
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeProgramme.results
                          .sort(
                            (a, b) => (a.position ?? 999) - (b.position ?? 999),
                          )
                          .map((r, idx) => (
                            <TableRow 
                              key={r.id}
                              className={cn(
                                r.position != null && MEDAL_ROWS[r.position - 1],
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
                              <TableCell className="font-medium">{r.grade ?? "—"}</TableCell>
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
                                {r.points}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <DrawerFooter className="flex-col sm:flex-row gap-2 px-4 pb-8 pt-4">
                  <p className="text-xs text-muted-foreground flex-1">
                    {activeProgramme.resultNumber != null
                      ? `This publishes result #${activeProgramme.resultNumber} to the public site and generates the poster.`
                      : "Assign a result number first."}
                  </p>
                  <Button
                    onClick={handleAnnounce}
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
