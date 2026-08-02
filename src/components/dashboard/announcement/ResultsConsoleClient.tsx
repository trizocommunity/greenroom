"use client";

import {
  ArrowDownUp,
  Eye,
  Loader2,
  Trophy,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
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
  publishStandings,
  swapResultNumbers,
  unpublishResult,
  updateResultTemplates,
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
  publishedTemplates: { code: string; name: string }[];
}

export function ResultsConsoleClient({
  festivalId,
  festivalSlug,
  published,
  liveStandings,
  standingsContext,
  canUnpublish,
  publishedTemplates,
}: ResultsConsoleClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeProgramme, setActiveProgramme] =
    useState<PublishedResultProgramme | null>(null);
  const [standingsScope, setStandingsScope] = useState<"published" | "all">(
    "published",
  );
  const [swapTarget, setSwapTarget] = useState<string | null>(null);

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

  function handleUpdateTemplates(
    programmeId: string,
    templateCodes: string[],
  ) {
    startTransition(async () => {
      const res = await updateResultTemplates(
        festivalId,
        programmeId,
        templateCodes,
      );
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Template updated.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Section 1 — Published Results */}
        <div className="lg:col-span-3 space-y-4">
          {sorted.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Trophy className="mx-auto h-10 w-10 mb-3 opacity-40" />
                <p className="font-medium">No published results yet</p>
                <p className="text-sm mt-1">
                  Announce results from the Announcer page.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Programme</TableHead>
                      <TableHead className="w-28">Template</TableHead>
                      <TableHead className="w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono font-bold">
                          {p.resultNumber != null ? `#${p.resultNumber}` : "—"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{p.name}</span>
                            <span className="text-muted-foreground text-xs ml-2">
                              {p.categoryName}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] mt-0.5"
                          >
                            {p.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.resultPosterTemplateCode
                            ?.split(",")
                            .map((code) => (
                              <Badge
                                key={code}
                                variant="secondary"
                                className="text-[10px] mr-1"
                              >
                                {code}
                              </Badge>
                            ))}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveProgramme(p)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {sorted.map((p) => (
                  <Card
                    key={p.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setActiveProgramme(p)}
                  >
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold min-w-[2rem]">
                          {p.resultNumber != null
                            ? `#${p.resultNumber}`
                            : "—"}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.categoryName}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        Published
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Section 2 — Standings */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Standings</CardTitle>
                  {standingsContext.standingsPublishedAtResultNumber !=
                    null && (
                    <span className="text-xs text-muted-foreground">
                      As of Result #
                      {standingsContext.standingsPublishedAtResultNumber}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Select
                    value={standingsScope}
                    onValueChange={(v) =>
                      setStandingsScope(v as "published" | "all")
                    }
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">
                        Published results
                      </SelectItem>
                      <SelectItem value="all">All results</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={isPending || standingsScope === "all"}
                    onClick={handlePublishStandings}
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : null}
                    Publish
                  </Button>
                </div>
                {newResultsSinceStandings != null &&
                  newResultsSinceStandings > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {newResultsSinceStandings} result
                      {newResultsSinceStandings > 1 ? "s" : ""} published since
                      last standings update.
                    </p>
                  )}
              </CardHeader>
              <CardContent>
                {displayStandings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No standings data yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead className="w-16 text-right">
                          Points
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayStandings.map((s) => (
                        <TableRow key={s.name}>
                          <TableCell className="font-mono font-bold">
                            {s.rank}
                          </TableCell>
                          <TableCell className="font-medium">
                            {s.name}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {s.points}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
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
                    <span className="font-mono text-primary">
                      #{activeProgramme.resultNumber}
                    </span>
                  )}
                  <span>{activeProgramme.name}</span>
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  {activeProgramme.categoryName}
                  <Badge variant="outline" className="text-[10px]">
                    {activeProgramme.type}
                  </Badge>
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

              {/* Template management */}
              {publishedTemplates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Template</p>
                  <div className="flex flex-wrap gap-2">
                    {publishedTemplates.map((t) => {
                      const currentCodes =
                        activeProgramme.resultPosterTemplateCode
                          ?.split(",")
                          .filter(Boolean) ?? [];
                      const isSelected = currentCodes.includes(t.code);
                      return (
                        <button
                          key={t.code}
                          type="button"
                          onClick={() => {
                            const newCodes = isSelected
                              ? currentCodes.filter((c) => c !== t.code)
                              : [...currentCodes, t.code];
                            if (newCodes.length > 0) {
                              handleUpdateTemplates(
                                activeProgramme.id,
                                newCodes,
                              );
                            }
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 border-border hover:bg-muted"
                          }`}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Result roster */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Result Roster</p>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
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
                          <TableRow key={r.id}>
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
                                ? "1st"
                                : r.position === 2
                                  ? "2nd"
                                  : r.position === 3
                                    ? "3rd"
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
    </>
  );
}
