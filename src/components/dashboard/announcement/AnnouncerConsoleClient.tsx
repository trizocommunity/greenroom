"use client";

import { format } from "date-fns";
import { Loader2, Megaphone, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AnnouncerCallListDrawer } from "@/components/dashboard/announcement/AnnouncerCallListDrawer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/core/utils/cn";
import { announceStandings } from "@/features/announcement/actions/announcer.actions";
import type {
  ActiveReportingProgramme,
  TeamStandingRow,
} from "@/features/announcement/services/announcer.service";
import { useLiveChannel } from "@/hooks/use-live-channel";
import { toast } from "@/lib/toast";

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
  return (
    <span className="pl-1 text-muted-foreground font-medium">{rank}th</span>
  );
}

interface Props {
  festivalId: string;
  queuedStandings: TeamStandingRow[];
  afterCount: number | null;
  callList: ActiveReportingProgramme[];
  userName?: string;
}

export function AnnouncerConsoleClient({
  festivalId,
  queuedStandings,
  afterCount,
  callList,
  userName,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedCallItem, setSelectedCallItem] =
    useState<ActiveReportingProgramme | null>(null);

  /* UC6 — listen to the announce channel so the console updates when a
     *different* announcer tab (or another role) advances a result. The
     `router.refresh()` re-runs the server loader, which re-pulls the
     queuedStandings and callList. Hook has its own auto-reconnect; the
     silent announce is fine if SSE drops because the next announce
     triggers another refresh anyway. */
  const { data: announceEvent } = useLiveChannel<{
    programmeId: string;
    position: number;
    resultNumber: number;
    startedAt: string;
  }>({
    url: `/api/v1/festivals/${festivalId}/announce/stream`,
  });

  useEffect(() => {
    if (!announceEvent) return;
    router.refresh();
  }, [announceEvent, router]);

  function handleAnnounce() {
    startTransition(async () => {
      const res = await announceStandings(festivalId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Standings announced successfully!");
      router.refresh();
    });
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const emoji = hour < 12 ? "☀️" : hour < 17 ? "👋" : "🌙";
  const dateStr = format(now, "EEEE, MMMM d");

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-4rem)]">
      {/* Greeting Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {greeting}, {userName ? userName.split(" ")[0] : "there"}! {emoji}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          It&apos;s {dateStr}. Let&apos;s get ready for event day.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-5 flex-1 items-start">
        {/* Left Panel — Standings */}
        <div className="flex flex-col rounded-2xl border bg-card overflow-hidden h-full">
          <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="font-semibold text-sm">Team Standings</span>
            </div>
            {afterCount && (
              <span className="text-xs text-muted-foreground">
                After result #{afterCount}
              </span>
            )}
          </div>

          {queuedStandings.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-muted-foreground px-6">
              <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Trophy className="h-7 w-7 text-muted-foreground/50" />
              </span>
              <p className="font-medium text-sm">No standings staged</p>
              <p className="text-xs mt-1 text-muted-foreground/70">
                Standings will appear here once results are published.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              {/* Desktop Table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-5 w-20 font-semibold text-foreground text-xs uppercase tracking-wide">
                        Rank
                      </TableHead>
                      <TableHead className="font-semibold text-foreground text-xs uppercase tracking-wide">
                        Team
                      </TableHead>
                      <TableHead className="text-right pr-5 font-semibold text-foreground text-xs uppercase tracking-wide">
                        Pts
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queuedStandings.map((s) => (
                      <TableRow
                        key={s.name}
                        className={cn(
                          "hover:bg-muted/40 transition-colors",
                          MEDAL_ROWS[s.rank - 1],
                        )}
                      >
                        <TableCell className="pl-5 py-3">
                          <PlaceLabel rank={s.rank} />
                        </TableCell>
                        <TableCell className="font-medium text-sm py-3">
                          {s.name}
                        </TableCell>
                        <TableCell className="text-right pr-5 font-mono font-bold text-sm py-3">
                          {s.points}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden divide-y divide-border">
                {queuedStandings.map((s) => (
                  <div
                    key={s.name}
                    className={cn(
                      "px-5 py-3 flex items-center justify-between",
                      MEDAL_ROWS[s.rank - 1],
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <PlaceLabel rank={s.rank} />
                      <span className="font-medium text-sm">{s.name}</span>
                    </div>
                    <span className="font-mono font-bold">{s.points}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Announce button at bottom */}
          {queuedStandings.length > 0 && (
            <div className="px-5 py-4 border-t bg-muted/10">
              <button
                type="button"
                onClick={handleAnnounce}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 transition-colors"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Megaphone className="h-4 w-4" />
                )}
                {isPending ? "Announcing…" : "Announce Standings"}
              </button>
            </div>
          )}
        </div>

        {/* Right Panel — Call List */}
        <div className="flex flex-col rounded-2xl border bg-card overflow-hidden h-full">
          <div className="px-5 py-4 border-b bg-muted/30 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-sky-500" />
            <span className="font-semibold text-sm">Call List</span>
            {callList.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {callList.length}
              </Badge>
            )}
          </div>

          {callList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-muted-foreground px-6">
              <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Megaphone className="h-7 w-7 text-muted-foreground/50" />
              </span>
              <p className="font-medium text-sm">No programmes called yet</p>
              <p className="text-xs mt-1 text-muted-foreground/70">
                The stage manager will notify you when a programme is ready.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto divide-y divide-border">
              {callList.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="w-full text-left px-5 py-4 hover:bg-muted/30 transition-colors flex items-start gap-3 group"
                  onClick={() => setSelectedCallItem(item)}
                >
                  {/* Status indicator dot */}
                  <span
                    className={cn(
                      "mt-1.5 flex-shrink-0 h-2 w-2 rounded-full",
                      item.startedAt ? "bg-green-500" : "bg-amber-400",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item.categoryName && (
                        <span className="text-xs text-muted-foreground">
                          {item.categoryName}
                        </span>
                      )}
                      {item.categoryName && item.stageName && (
                        <span className="text-xs text-muted-foreground">•</span>
                      )}
                      {item.stageName && (
                        <span className="text-xs text-muted-foreground">
                          {item.stageName}
                        </span>
                      )}
                    </div>
                    {item.startedAt && (
                      <span className="text-[11px] text-green-600 dark:text-green-400 font-medium mt-1 block">
                        Started {format(new Date(item.startedAt), "h:mm a")}
                      </span>
                    )}
                  </div>
                  <Badge
                    variant={item.startedAt ? "default" : "outline"}
                    className={cn(
                      "flex-shrink-0 text-[10px] px-2 py-0.5",
                      item.startedAt
                        ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20"
                        : "text-amber-600 border-amber-400/40",
                    )}
                  >
                    {item.startedAt ? "In Progress" : "Called"}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnnouncerCallListDrawer
        open={!!selectedCallItem}
        onOpenChange={(open) => !open && setSelectedCallItem(null)}
        item={selectedCallItem}
        festivalId={festivalId}
      />
    </div>
  );
}
