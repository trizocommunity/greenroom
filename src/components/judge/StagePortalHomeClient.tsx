"use client";

import { format, isToday, parseISO } from "date-fns";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogOut,
  Radio,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  useLogoutStagePortal,
  useStagePortalBoard,
} from "@/api/client/server-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/core/utils/cn";
import type { StagePortalLivePayload } from "@/components/judge/StagePortalScoringClient";
import { StagePortalScoringClient } from "@/components/judge/StagePortalScoringClient";

type PortalStatus = "SCHEDULED" | "REPORTING" | "LIVE" | "JUDGED";

const STATUS_META: Record<
  PortalStatus,
  { label: string; className: string }
> = {
  LIVE: {
    label: "Live",
    className: "bg-primary/15 text-primary",
  },
  REPORTING: {
    label: "Reporting",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  JUDGED: {
    label: "Judged",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  SCHEDULED: {
    label: "Scheduled",
    className: "bg-muted text-muted-foreground",
  },
};

function dayLabel(dayKey: string): string {
  try {
    const d = parseISO(dayKey);
    if (isToday(d)) return "Today";
    return format(d, "EEE, MMM d");
  } catch {
    return dayKey;
  }
}

export function StagePortalHomeClient() {
  const router = useRouter();
  const [day, setDay] = useState<string | undefined>(undefined);
  const { data, isLoading, refetch } = useStagePortalBoard(day);
  const logout = useLogoutStagePortal();
  const [scoring, setScoring] = useState<StagePortalLivePayload | null>(null);

  const stageName = data?.stage?.name ?? "Stage";
  const days = data?.days ?? [];
  const selectedDay = data?.selectedDay;

  // Order days with today first, then the rest chronologically.
  const orderedDays = useMemo(() => {
    if (days.length === 0) return [] as string[];
    const todayKey = format(new Date(), "yyyy-MM-dd");
    const rest = days.filter((d) => d !== todayKey);
    return days.includes(todayKey) ? [todayKey, ...rest] : days;
  }, [days]);

  const selectedIndex = selectedDay ? days.indexOf(selectedDay) : -1;
  const goPrevDay = () => {
    if (selectedIndex > 0) setDay(days[selectedIndex - 1]);
  };
  const goNextDay = () => {
    if (selectedIndex >= 0 && selectedIndex < days.length - 1)
      setDay(days[selectedIndex + 1]);
  };

  if (scoring) {
    return (
      <div className="mx-auto w-full max-w-full px-3 pt-6 sm:max-w-3xl sm:px-6 sm:pt-10 lg:max-w-5xl">
        <StagePortalScoringClient
          stageName={stageName}
          payload={scoring}
          onDone={() => {
            setScoring(null);
            refetch();
          }}
        />
      </div>
    );
  }

  const live = data?.live ?? null;
  const doneCount = live
    ? Object.values(live.judgeCompletion ?? {}).filter(Boolean).length
    : 0;

  return (
    <div className="mx-auto w-full max-w-full px-3 pb-16 pt-6 sm:max-w-3xl sm:px-6 sm:pt-10 lg:max-w-5xl">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Stage Judge Portal
          </p>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {stageName}
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            logout.mutate(undefined, { onSuccess: () => router.refresh() })
          }
        >
          <LogOut className="mr-1.5 h-4 w-4" aria-hidden />
          Log out
        </Button>
      </header>

      {/* Day switcher */}
      {orderedDays.length > 0 ? (
        <div className="mb-5 flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={goPrevDay}
            disabled={selectedIndex <= 0}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {orderedDays.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  d === selectedDay
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/70 text-muted-foreground hover:bg-muted/40",
                )}
              >
                {dayLabel(d)}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={goNextDay}
            disabled={selectedIndex < 0 || selectedIndex >= days.length - 1}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {/* Hero live card */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : live ? (
        <Card className="relative overflow-hidden border-primary/40 bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] shadow-md">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              <Badge className="gap-1.5 rounded-md bg-primary/15 text-primary hover:bg-primary/15">
                <Radio className="h-3.5 w-3.5" aria-hidden />
                Live now
              </Badge>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                {live.programme.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {live.codeLetters.length} code letter
                {live.codeLetters.length === 1 ? "" : "s"} ·{" "}
                {live.judgingMode === "GROUP" ? "Group panel" : "Separate judges"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {live.judges.map((j) => {
                const done = live.judgeCompletion?.[j.id];
                return (
                  <span
                    key={j.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                      done
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "border-border/70 text-muted-foreground",
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    ) : null}
                    {j.name}
                  </span>
                );
              })}
            </div>
            {live.judgingMode === "SINGLE" && live.judges.length > 1 ? (
              <p className="text-xs font-medium text-muted-foreground">
                {doneCount} of {live.judges.length} judges submitted
              </p>
            ) : null}
            <Button
              size="lg"
              className="h-12 w-full text-base font-semibold sm:w-auto"
              onClick={() => setScoring(live)}
            >
              Enter scores
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-border/60 bg-muted/20">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No live programme right now. It appears here the moment your stage
              manager starts judgement.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Read-only today board */}
      <section className="mt-8 space-y-3">
        <h3 className="text-sm font-semibold tracking-tight">
          {selectedDay ? dayLabel(selectedDay) : "Today"}'s programmes
        </h3>
        {!data?.programmes?.length ? (
          <p className="text-xs text-muted-foreground">
            No programmes scheduled on this stage for this day.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-lg border">
            {data.programmes.map((p) => {
              const meta = STATUS_META[p.portalStatus as PortalStatus];
              return (
                <li
                  key={`${p.programmeId}-${p.startTime}`}
                  className="flex items-center justify-between gap-3 bg-background px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden />
                      {(() => {
                        try {
                          return format(parseISO(p.startTime), "HH:mm");
                        } catch {
                          return "—";
                        }
                      })()}
                    </span>
                    <span className="truncate text-sm font-medium">
                      {p.name}
                    </span>
                  </div>
                  <Badge
                    className={cn(
                      "shrink-0 rounded-md font-normal hover:bg-transparent",
                      meta.className,
                    )}
                  >
                    {meta.label}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">
          This board is read-only. Only the live programme can be scored.
        </p>
      </section>
    </div>
  );
}
