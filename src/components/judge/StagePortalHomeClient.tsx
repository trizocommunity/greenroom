"use client";

import { format, isToday, parseISO } from "date-fns";
import { Check, ChevronLeft, ChevronRight, Clock, LogOut } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  useLogoutStagePortal,
  useStagePortalBoard,
} from "@/api/client/server-actions";
import {
  AppEmptyState,
  StatusPill,
  type StatusTone,
} from "@/components/app/AppSection";
import type { StagePortalLivePayload } from "@/components/judge/StagePortalScoringClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/core/utils/cn";

type PortalStatus = "SCHEDULED" | "REPORTING" | "LIVE" | "JUDGED";

const STATUS_META: Record<PortalStatus, { label: string; tone: StatusTone }> = {
  LIVE: { label: "Live", tone: "ready" },
  REPORTING: { label: "Reporting", tone: "warning" },
  JUDGED: { label: "Judged", tone: "live" },
  SCHEDULED: { label: "Scheduled", tone: "muted" },
};

const PORTAL_CONTAINER = "mx-auto w-full max-w-3xl px-4 sm:px-6";

function dayLabel(dayKey: string): string {
  try {
    const d = parseISO(dayKey);
    if (isToday(d)) return "Today";
    return format(d, "EEE, MMM d");
  } catch {
    return dayKey;
  }
}

function timeLabel(iso: string): string {
  try {
    return format(parseISO(iso), "HH:mm");
  } catch {
    return "—";
  }
}

function LiveCard({
  live,
  slug,
}: {
  live: StagePortalLivePayload;
  slug: string;
}) {
  const router = useRouter();
  const doneCount = Object.values(live.judgeCompletion ?? {}).filter(
    Boolean,
  ).length;

  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/[0.05] p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill tone="ready" pulse>
          Live now
        </StatusPill>
        {live.programme.categoryName && (
          <StatusPill tone="muted">{live.programme.categoryName}</StatusPill>
        )}
      </div>

      <h2 className="mt-4 text-xl font-semibold tracking-tight text-heading sm:text-2xl">
        {live.programme.name}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {live.programme.categoryName ? `${live.programme.categoryName} · ` : ""}
        {live.codeLetters.length} code letter
        {live.codeLetters.length === 1 ? "" : "s"} ·{" "}
        {live.judgingMode === "GROUP" ? "Group panel" : "Separate judges"}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {live.judges.map((j) => {
          const done = live.judgeCompletion?.[j.id];
          return (
            <StatusPill
              key={j.id}
              tone={done ? "live" : "muted"}
              icon={done ? Check : undefined}
            >
              {j.name}
            </StatusPill>
          );
        })}
      </div>

      {live.judgingMode === "SINGLE" && live.judges.length > 1 && (
        <p className="mt-3 text-xs tabular-nums text-muted-foreground">
          {doneCount} of {live.judges.length} judges submitted
        </p>
      )}

      <Button
        size="lg"
        className="mt-5 h-12 w-full rounded-full text-base font-medium shadow-primary-glow"
        onClick={() =>
          router.push(`/${slug}/stage-portal/score/${live.configId}`)
        }
      >
        Enter scores
      </Button>
    </section>
  );
}

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function StagePortalHomeClient() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [day, setDay] = useState<string | undefined>(undefined);
  const [pageIndex, setPageIndex] = useState(0);
  const { data, isLoading } = useStagePortalBoard(day);
  const logout = useLogoutStagePortal();

  const pageSize = 15;
  const totalPages = Math.ceil((data?.programmes?.length || 0) / pageSize);

  const stageName = data?.stage?.name ?? "Stage";
  const isOffStage = data?.stage?.isOffStage ?? false;
  const days = data?.days ?? [];
  const selectedDay = data?.selectedDay;
  const liveConfigs: StagePortalLivePayload[] =
    (data as any)?.liveConfigs ?? [];

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

  return (
    <div className={cn(PORTAL_CONTAINER, "pb-16 pt-6 sm:pt-10")}>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Stage judge portal
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-heading">
            {isOffStage ? "Off-Stage" : stageName}
          </h1>
          {isOffStage && (
            <p className="mt-1 text-xs text-muted-foreground">
              Programmes without a scheduled time are judged here.
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          onClick={() =>
            logout.mutate(undefined, { onSuccess: () => router.refresh() })
          }
        >
          <LogOut className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Log out
        </Button>
      </header>

      {/* Day switcher — hidden for off-stage */}
      {!isOffStage && orderedDays.length > 0 && (
        <div className="mb-6 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            onClick={goPrevDay}
            disabled={selectedIndex <= 0}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="scrollbar-hide -mx-1 flex flex-1 gap-1 overflow-x-auto px-1">
            {orderedDays.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                aria-pressed={d === selectedDay}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  d === selectedDay
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {dayLabel(d)}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            onClick={goNextDay}
            disabled={selectedIndex < 0 || selectedIndex >= days.length - 1}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Live programme cards */}
      {isLoading ? (
        <Skeleton className="h-52 w-full rounded-2xl" />
      ) : liveConfigs.length > 0 ? (
        <div className="space-y-4">
          {liveConfigs.map((live) => (
            <LiveCard key={live.configId} live={live} slug={slug} />
          ))}
        </div>
      ) : (
        <AppEmptyState
          title="Nothing live right now"
          description="This screen updates the moment your stage manager starts judgement."
        />
      )}

      {/* Read-only board */}
      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {isOffStage
              ? "All programmes"
              : selectedDay
                ? dayLabel(selectedDay)
                : "Today"}
          </h2>
          <span className="text-xs text-muted-foreground">Read-only</span>
        </div>

        {!data?.programmes?.length ? (
          <p className="text-sm text-muted-foreground">
            {isOffStage
              ? "No programmes assigned to off-stage yet."
              : "Nothing scheduled on this stage for this day."}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border border-y border-border">
              {data.programmes
                .slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)
                .map((p) => {
                  const meta = STATUS_META[p.portalStatus as PortalStatus];
                  return (
                    <li
                      key={`${p.programmeId}-${p.startTime}`}
                      className="flex items-center gap-3 py-3"
                    >
                      {!isOffStage && (
                        <span className="flex w-12 shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                          <Clock className="h-3 w-3" aria-hidden />
                          {timeLabel(p.startTime)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-heading">
                          {p.name}
                        </span>
                        {p.categoryName && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {p.categoryName}
                          </span>
                        )}
                      </div>
                      <StatusPill tone={meta.tone} className="shrink-0">
                        {meta.label}
                      </StatusPill>
                    </li>
                  );
                })}
            </ul>
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center pb-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={(e) => {
                          e.preventDefault();
                          setPageIndex((p) => Math.max(0, p - 1));
                        }}
                        className={
                          pageIndex === 0
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>

                    {[...Array(totalPages)].map((_, i) => {
                      if (
                        i === 0 ||
                        i === totalPages - 1 ||
                        (i >= pageIndex - 1 && i <= pageIndex + 1)
                      ) {
                        return (
                          <PaginationItem key={i}>
                            <PaginationLink
                              isActive={pageIndex === i}
                              onClick={(e) => {
                                e.preventDefault();
                                setPageIndex(i);
                              }}
                            >
                              {i + 1}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }

                      if (i === pageIndex - 2 || i === pageIndex + 2) {
                        return (
                          <PaginationItem key={i}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }

                      return null;
                    })}

                    <PaginationItem>
                      <PaginationNext
                        onClick={(e) => {
                          e.preventDefault();
                          setPageIndex((p) => Math.min(totalPages - 1, p + 1));
                        }}
                        className={
                          pageIndex === totalPages - 1
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
