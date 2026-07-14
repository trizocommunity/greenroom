"use client";

import { CheckCircle2, Loader2, Mic2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AnnouncerBlockProgressBanner } from "@/components/dashboard/announcement/AnnouncerBlockProgressBanner";
import { ProgrammeStatusBadge } from "@/components/festival/ProgrammeStatusBadge";
import { ResultPosterActions } from "@/components/festival/posters/ResultPosterActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProgrammeStatus } from "@/core/types/app-enums";
import { markProgrammeAnnounced } from "@/features/announcement/actions/announcement.actions";
import type { AnnouncementDeskProgramme } from "@/features/announcement/services/announcement-desk.service";
import type { AnnouncerBlockProgress } from "@/features/announcement/services/announcer-result-count.service";
import {
  getResultPosterExportPayloadAction,
  type ResultPosterExportPayload,
} from "@/features/posters/actions/poster-export.actions";

interface AnnouncementDeskClientProps {
  festivalId: string;
  festivalSlug: string;
  queue: AnnouncementDeskProgramme[];
  announced: AnnouncementDeskProgramme[];
  block: AnnouncerBlockProgress;
}

function ProgrammeResultsPreview({
  programme,
}: {
  programme: AnnouncementDeskProgramme;
}) {
  if (programme.results.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground border-l-2 border-muted pl-3">
      {programme.results.map((r) => (
        <li key={r.id} className="flex flex-col gap-0.5">
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            <span className="font-medium text-foreground">
              {r.position != null ? `#${r.position}` : "—"} {r.winnerName}
            </span>
            {programme.type !== "GROUP" && r.groupName ? (
              <span>({r.groupName})</span>
            ) : null}
            <span>
              {r.points} pts{r.grade ? ` · ${r.grade}` : ""}
            </span>
          </div>
          {programme.type === "GROUP" &&
            r.studentNames &&
            r.studentNames.length > 0 && (
              <span className="text-[11px] text-muted-foreground pl-1">
                Members: {r.studentNames.join(", ")}
              </span>
            )}
        </li>
      ))}
    </ul>
  );
}

export function AnnouncementDeskClient({
  festivalId,
  festivalSlug,
  queue,
  announced,
  block,
}: AnnouncementDeskClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  const [reviewProgramme, setReviewProgramme] =
    useState<AnnouncementDeskProgramme | null>(null);
  const [posterPayload, setPosterPayload] =
    useState<ResultPosterExportPayload | null>(null);
  const [loadingPoster, setLoadingPoster] = useState(false);

  const handleOpenReview = (prog: AnnouncementDeskProgramme) => {
    setReviewProgramme(prog);
    setPosterPayload(null);
    setLoadingPoster(true);
    void getResultPosterExportPayloadAction(prog.id).then((res) => {
      if (res.success && res.data) {
        setPosterPayload(res.data);
      } else {
        setPosterPayload(null);
      }
      setLoadingPoster(false);
    });
  };

  const handleAnnounce = (programmeId: string) => {
    setActiveId(programmeId);
    startTransition(async () => {
      try {
        const res = await markProgrammeAnnounced(festivalId, programmeId);
        if (!res.success) {
          toast.error(res.error ?? "Failed to mark announced");
          return;
        }
        const slots = res.data?.slotsAnnounced ?? 0;
        toast.success(
          slots === 1
            ? "1 result announced on-air"
            : `${slots} results announced on-air`,
        );
        if (res.data?.standingsDue) {
          toast.info(
            `You've reached ${block.resultsPerBlock} announced results — publish group standings next.`,
            { duration: 8000 },
          );
        }
        router.refresh();
      } finally {
        setActiveId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <AnnouncerBlockProgressBanner
        block={block}
        festivalSlug={festivalSlug}
        showStandingsLink
      />

      {block.standingsDue ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Mic2 className="h-4 w-4" />
              Group standings due
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              You have announced {block.resultsPerBlock} results in this block.
              Publish team standings from the Group Standings page before
              continuing the next batch on-air.
            </p>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Ready to announce ({queue.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Programmes published to the desk that still need to be announced
            on-air.
          </p>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No programmes waiting. Publish results from the Results page
              first.
            </p>
          ) : (
            <div className="space-y-6">
              {queue.map((prog) => (
                <div
                  key={prog.id}
                  className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{prog.name}</span>
                      <ProgrammeStatusBadge
                        status={prog.status as ProgrammeStatus}
                      />
                      {prog.categoryName ? (
                        <span className="text-sm text-muted-foreground font-medium">
                          · {prog.categoryName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0"
                    disabled={isPending}
                    onClick={() => handleOpenReview(prog)}
                  >
                    {isPending && activeId === prog.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Mic2 className="h-4 w-4 mr-1" />
                    )}
                    Announce
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Announced ({announced.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Programmes already announced on-air. They are live on the public
            site when programme-results mode is active.
          </p>
        </CardHeader>
        <CardContent>
          {announced.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No programmes announced yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Programme</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result slots</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announced.map((prog) => (
                  <TableRow key={prog.id}>
                    <TableCell>
                      <div className="font-medium">{prog.name}</div>
                      <ProgrammeResultsPreview programme={prog} />
                    </TableCell>
                    <TableCell>{prog.categoryName ?? "—"}</TableCell>
                    <TableCell>
                      <ProgrammeStatusBadge
                        status={prog.status as ProgrammeStatus}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30">
                        {prog.announcedSlotCount}/{prog.publishedSlotCount}{" "}
                        on-air
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {reviewProgramme && (
        <Dialog
          open={!!reviewProgramme}
          onOpenChange={(open) => {
            if (!open) {
              setReviewProgramme(null);
              setPosterPayload(null);
            }
          }}
        >
          <DialogContent className="max-w-[calc(100vw-2rem)] w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] md:max-w-[calc(100vw-4rem)] md:w-[calc(100vw-4rem)] md:h-[calc(100vh-4rem)] md:max-h-[calc(100vh-4rem)] flex flex-col p-6 overflow-hidden bg-background">
            <DialogHeader className="pb-2 border-b shrink-0">
              <DialogTitle className="text-xl flex items-center gap-2">
                <Mic2 className="h-5 w-5 text-primary" />
                Review Announcement: {reviewProgramme.name}
              </DialogTitle>
              <DialogDescription>
                Review the participants, code letters, and results poster before
                publishing to the public live page.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 py-4 overflow-hidden">
              {/* Left Column - Results Table */}
              <div className="lg:col-span-5 flex flex-col h-full overflow-hidden border rounded-lg bg-card/50">
                <div className="p-3 border-b bg-muted/30 shrink-0">
                  <h3 className="font-semibold text-sm">
                    Results ({reviewProgramme.results.length})
                  </h3>
                </div>
                <div className="flex-1 overflow-auto p-2">
                  {reviewProgramme.results.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No results published for this programme.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
                        <TableRow>
                          <TableHead className="w-[80px]">Rank</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead className="w-[70px]">Code</TableHead>
                          <TableHead className="w-[70px]">Grade</TableHead>
                          <TableHead className="w-[80px]">Points</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reviewProgramme.results.map((r) => {
                          let rankDisplay: React.ReactNode = r.position;
                          if (r.position === 1) {
                            rankDisplay = (
                              <span className="flex items-center gap-1">
                                <span
                                  className="text-base"
                                  role="img"
                                  aria-label="First Place Gold Medal"
                                >
                                  🥇
                                </span>
                                <span className="font-bold text-foreground">
                                  1
                                </span>
                              </span>
                            );
                          } else if (r.position === 2) {
                            rankDisplay = (
                              <span className="flex items-center gap-1">
                                <span
                                  className="text-base"
                                  role="img"
                                  aria-label="Second Place Silver Medal"
                                >
                                  🥈
                                </span>
                                <span className="font-bold text-foreground">
                                  2
                                </span>
                              </span>
                            );
                          } else if (r.position === 3) {
                            rankDisplay = (
                              <span className="flex items-center gap-1">
                                <span
                                  className="text-base"
                                  role="img"
                                  aria-label="Third Place Bronze Medal"
                                >
                                  🥉
                                </span>
                                <span className="font-bold text-foreground">
                                  3
                                </span>
                              </span>
                            );
                          } else {
                            rankDisplay = (
                              <span className="font-medium text-muted-foreground pl-1">
                                {r.position || "—"}
                              </span>
                            );
                          }

                          let teamNameDisplay = "";
                          const groupSubText = r.groupName || "";

                          if (reviewProgramme.type === "GROUP") {
                            const firstMember =
                              r.studentNames?.[0] || "Unknown";
                            teamNameDisplay = `${firstMember} & team`;
                          } else {
                            teamNameDisplay = r.winnerName;
                          }

                          let gradeBadge = null;
                          if (r.grade) {
                            const gUpper = r.grade.toUpperCase();
                            if (gUpper === "A") {
                              gradeBadge = (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-none font-bold px-2 py-0.5 rounded text-xs">
                                  A
                                </Badge>
                              );
                            } else if (gUpper === "B") {
                              gradeBadge = (
                                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border-none font-bold px-2 py-0.5 rounded text-xs">
                                  B
                                </Badge>
                              );
                            } else if (gUpper === "C") {
                              gradeBadge = (
                                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-none font-bold px-2 py-0.5 rounded text-xs">
                                  C
                                </Badge>
                              );
                            } else {
                              gradeBadge = (
                                <Badge className="bg-muted text-muted-foreground hover:bg-muted border-none font-bold px-2 py-0.5 rounded text-xs">
                                  {r.grade}
                                </Badge>
                              );
                            }
                          } else {
                            gradeBadge = (
                              <span className="text-muted-foreground text-xs">
                                —
                              </span>
                            );
                          }

                          return (
                            <TableRow key={r.id}>
                              <TableCell className="align-middle">
                                {rankDisplay}
                              </TableCell>
                              <TableCell className="align-middle pr-2">
                                <div className="font-semibold text-sm text-foreground leading-tight">
                                  {teamNameDisplay}
                                </div>
                                {groupSubText && (
                                  <div className="text-[10px] tracking-wider text-muted-foreground uppercase mt-0.5 font-medium">
                                    {groupSubText}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="align-middle">
                                <Badge
                                  variant="outline"
                                  className="border-muted-foreground/30 font-mono font-bold px-2 py-0.5 text-xs rounded text-foreground bg-muted/5"
                                >
                                  {r.code || "—"}
                                </Badge>
                              </TableCell>
                              <TableCell className="align-middle">
                                {gradeBadge}
                              </TableCell>
                              <TableCell className="align-middle">
                                <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap">
                                  {r.points} pts
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>

              {/* Right Column - Results Poster Preview */}
              <div className="lg:col-span-7 flex flex-col h-full overflow-hidden border rounded-lg bg-card/50">
                <div className="p-3 border-b bg-muted/30 shrink-0">
                  <h3 className="font-semibold text-sm">
                    Results Poster Preview
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center items-center bg-muted/5 relative">
                  {loadingPoster ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Loading poster template...
                      </span>
                    </div>
                  ) : posterPayload ? (
                    <div className="w-full max-w-[500px] max-h-full">
                      <ResultPosterActions
                        payload={posterPayload}
                        festivalSlug={festivalSlug}
                        canSwap={true}
                      />
                    </div>
                  ) : (
                    <div className="text-center p-6 border border-dashed rounded-lg max-w-sm">
                      <p className="text-sm font-medium text-muted-foreground">
                        No published poster template
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        No poster template has been published for this festival.
                        You can design one in the Poster Editor.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-3 shrink-0">
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setReviewProgramme(null);
                  setPosterPayload(null);
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={isPending}
                onClick={() => {
                  if (reviewProgramme) {
                    handleAnnounce(reviewProgramme.id);
                    setReviewProgramme(null);
                    setPosterPayload(null);
                  }
                }}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Announcing...
                  </>
                ) : (
                  <>
                    <Mic2 className="h-4 w-4 mr-2" />
                    Announce on-air
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
