"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Megaphone, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { TeamStandingRow } from "@/features/announcement/services/announcer.service";
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
  return <span className="pl-6 text-muted-foreground">{rank}th</span>;
}

interface Props {
  festivalId: string;
  queuedStandings: TeamStandingRow[];
  afterCount: number | null;
}

export function AnnouncerConsoleClient({
  festivalId,
  queuedStandings,
  afterCount,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/40 p-4 rounded-xl border border-muted">
        <div>
          <h2 className="font-semibold text-lg">Staged Standings</h2>
          <p className="text-sm text-muted-foreground">
            {afterCount
              ? `Calculated after result #${afterCount}`
              : "No specific after count."}
          </p>
        </div>
        <Button
          size="lg"
          className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm shrink-0"
          disabled={isPending || queuedStandings.length === 0}
          onClick={handleAnnounce}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Megaphone className="h-4 w-4 mr-2" />
          )}
          Announce to Public
        </Button>
      </div>

      {queuedStandings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Trophy className="h-7 w-7 text-muted-foreground/60" />
            </span>
            <p className="font-medium">No standings staged for announcement</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-xl bg-card overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader className="bg-muted/30 border-b">
                <TableRow>
                  <TableHead className="w-24 pl-6 font-semibold text-foreground">
                    Place
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Team
                  </TableHead>
                  <TableHead className="w-32 text-right pr-6 font-semibold text-foreground">
                    Points
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queuedStandings.map((s) => (
                  <TableRow
                    key={s.name}
                    className={cn(
                      "hover:bg-muted/50 transition-colors",
                      MEDAL_ROWS[s.rank - 1],
                    )}
                  >
                    <TableCell className="pl-6 font-medium">
                      <PlaceLabel rank={s.rank} />
                    </TableCell>
                    <TableCell className="font-medium text-[15px]">
                      {s.name}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold pr-6 text-[15px]">
                      {s.points}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards View */}
          <div className="block sm:hidden divide-y divide-border">
            {queuedStandings.map((s) => (
              <div
                key={s.name}
                className={cn(
                  "p-4 flex items-center justify-between",
                  MEDAL_ROWS[s.rank - 1],
                )}
              >
                <div className="flex items-center gap-3">
                  <PlaceLabel rank={s.rank} />
                  <div className="font-medium text-[15px]">{s.name}</div>
                </div>
                <div className="font-mono font-bold text-lg">{s.points}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
