"use client";

import { CheckCircle2, Hash, Loader2, Megaphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { announceResult } from "@/features/announcement/actions/announcer.actions";
import type { AnnouncerQueueProgramme } from "@/features/announcement/services/announcer.service";

interface AnnouncerClientProps {
  festivalId: string;
  festivalSlug: string;
  queue: AnnouncerQueueProgramme[];
  nextResultNumber: number;
}

export function AnnouncerClient({
  festivalId,
  festivalSlug,
  queue,
  nextResultNumber,
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

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Megaphone className="mx-auto h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">No programmes ready to announce</p>
          <p className="text-sm mt-1">
            Programmes will appear here once judgement is complete.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* List view */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">#</TableHead>
              <TableHead>Programme</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-24">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <span className="font-mono text-sm font-bold">
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
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                        {p.type === "GROUP" ? "Group" : "Individual"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                        {p.stageType === "NON_STAGE" ? "Offstage" : "Stage"}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  >
                    Ready
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveProgramme(p)}
                  >
                    Open
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
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
                  {p.resultNumber != null ? `#${p.resultNumber}` : "—"}
                </span>
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-muted-foreground">
                      {p.categoryName}
                    </p>
                    <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-normal">
                      {p.type === "GROUP" ? "Group" : "Individual"}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-normal">
                      {p.stageType === "NON_STAGE" ? "Offstage" : "Stage"}
                    </Badge>
                  </div>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              >
                Ready
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Announcer drawer */}
      <Drawer
        open={!!activeProgramme}
        onOpenChange={(open) => !open && setActiveProgramme(null)}
      >
        <DrawerContent>
          <div className="mx-auto w-full max-w-4xl overflow-y-auto">
            {activeProgramme && (
              <>
                <DrawerHeader>
                  <DrawerTitle className="flex items-center gap-2">
                    {activeProgramme.resultNumber != null && (
                      <span className="font-mono text-primary text-xl">
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
                      {activeProgramme.type === "GROUP" ? "Group" : "Individual"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {activeProgramme.stageType === "NON_STAGE" ? "Offstage" : "Stage"}
                    </Badge>
                  </div>
                </DrawerHeader>

                {/* Result roster */}
                <div className="space-y-2 py-2">
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
                            (a, b) => (a.position ?? 999) - (b.position ?? 999),
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
                    className="relative overflow-hidden font-bold"
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
