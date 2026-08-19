"use client";

import { motion } from "framer-motion";
import { ChevronRight, Loader2, Medal, Search, Trophy } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PublicResultPosterSection } from "@/components/festival/posters/PublicResultPosterSection";
import {
  EmptyState,
  PublicSection,
} from "@/components/festival/public/PublicSection";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/core/utils/cn";
import { usePublicPages } from "@/features/festivals/hooks/use-public-pages";
import type {
  PublicProgrammeResults,
  PublicResultsPage,
} from "@/features/festivals/loaders/festival-results.loader";
import { useLiveChannel } from "@/hooks/use-live-channel";
import { TeamStandingsSection } from "./TeamStandingsSection";

export interface Result {
  id: string;
  programmeId: string;
  programName: string;
  programmeType: "INDIVIDUAL" | "GROUP";
  category: string;
  winner: string;
  team: string; // This is the group name
  position: number;
  points: number;
  awardPoints: number;
  grade?: string | null;
  codeLetter?: string | null;
  chestNo?: string | null;
}

export interface TeamStanding {
  name: string;
  points: number;
  rank?: number;
  isGroup?: boolean;
}

interface ResultsListProps {
  festivalName: string;
  festivalSlug: string;
  /** Festival ID for the SSE channel. Same value as `festival.id` on the
   *  server-rendered loader. The slug routes the public API; the ID makes
   *  the Redis Pub/Sub channel key unambiguous from other surfaces. */
  festivalId: string;
  accentColor: string;
  /** Server-rendered first page of programme results. */
  initialResults: PublicResultsPage;
  teamStandings?: TeamStanding[];
  scoringSystem?: "POSITION_BASED" | "SCORE_BASED";
}

/** Matches `PUBLIC_RESULTS_PAGE_SIZE`; kept local so this file stays client-safe. */
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;
const REFRESH_MS = 30_000;

const selectProgrammes = (data: unknown) =>
  (data as { programmes: PublicProgrammeResults[] }).programmes;

export function ResultsList({
  festivalName,
  festivalSlug,
  festivalId,
  accentColor,
  initialResults,
  teamStandings: initialTeamStandings,
}: ResultsListProps) {
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"program" | "team">("program");
  const [searchQuery, setSearchQuery] = useState("");
  const [programTypeFilter, setProgramTypeFilter] = useState<
    "ALL" | "INDIVIDUAL" | "GROUP"
  >("ALL");
  const [selectedProgram, setSelectedProgram] =
    useState<PublicProgrammeResults | null>(null);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<
    string | null
  >(null);
  const [isLoadingDeepLink, setIsLoadingDeepLink] = useState(false);

  const {
    items: programmes,
    total,
    page,
    hasMore,
    isLoadingMore,
    isRefiltering,
    error,
    loadMore,
    refilter,
    refreshFirstPage,
    goToPage,
  } = usePublicPages<PublicProgrammeResults>({
    endpoint: `/api/festivals/${festivalSlug}/results`,
    select: selectProgrammes,
    pageSize: PAGE_SIZE,
    initial: {
      items: initialResults.programmes,
      total: initialResults.total,
      page: initialResults.page,
      hasMore: initialResults.hasMore,
    },
  });

  /* Search and type filtering run on the server, so a visitor searching a
     large festival still only downloads one page of matches. */
  const isFirstFilterRun = useRef(true);
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      refilter({
        search: searchQuery.trim() || undefined,
        type: programTypeFilter === "ALL" ? undefined : programTypeFilter,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchQuery, programTypeFilter, refilter]);

  /* Live results used to poll `router.refresh()`, which re-ran every loader
     on the page. Now only page 1 is re-read, and only while the visitor is
     actually looking at page 1 — paging or filtering suspends it. */
  const canRefresh =
    activeTab === "program" &&
    page === 1 &&
    !searchQuery.trim() &&
    programTypeFilter === "ALL";

  /* UC17 — `announceResult` publishes `{ festivalId, count, lastResultAt }`
     to the public results-count channel. Treat every event as a "something
     changed, refresh page 1" signal. The hook has its own exponential
     backoff, so we don't need to wrap the EventSource here. */
  const { data: resultsCountEvent, status: liveStatus } = useLiveChannel<{
    festivalId: string;
    count: number;
    lastResultAt: string;
  }>({
    url: `/api/v1/festivals/${festivalId}/results-count/stream`,
  });

  /* UC6 — `announceResult` also publishes `{ programmeId, position,
     resultNumber, startedAt }` to the announce channel. We don't render
     the announcement tickertape here — the panel handles that role — but
     a fresh event means a result is now public, so refresh page 1. The
     `data` reference is stable so we explicitly destructure the URL into
     the dep array. */
  const { data: announceEvent, status: announceStatus } = useLiveChannel<{
    programmeId: string;
    position: number;
    resultNumber: number;
    startedAt: string;
  }>({
    url: `/api/v1/festivals/${festivalId}/announce/stream`,
  });

  useEffect(() => {
    if (!canRefresh) return;
    if (!resultsCountEvent) return;
    refreshFirstPage();
  }, [resultsCountEvent, canRefresh, refreshFirstPage]);

  useEffect(() => {
    if (!canRefresh) return;
    if (!announceEvent) return;
    refreshFirstPage();
  }, [announceEvent, canRefresh, refreshFirstPage]);

  /* Polling fallback. Runs only when SSE is not `open` — when the channel
     reconnects with backoff (>1s) or has failed, the 30s poll keeps the
     page moving. Mirrors the pre-Issue-48 behaviour exactly so a broken
     SSE handler never causes a visible regression. Either channel being
     open is enough to suppress the poll. */
  useEffect(() => {
    if (!canRefresh) return;
    if (liveStatus === "open" || announceStatus === "open") return;
    const id = window.setInterval(refreshFirstPage, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [canRefresh, liveStatus, announceStatus, refreshFirstPage]);

  /* Shared poster links land on ?programmeId=…, which may point at a
     programme outside the loaded page — so fetch just that one. */
  const openProgrammeById = useCallback(
    async (programmeId: string, templateCode?: string | null) => {
      setSelectedTemplateCode(templateCode ?? null);

      const loaded = programmes.find((p) => p.id === programmeId);
      if (loaded) {
        setSelectedProgram(loaded);
        return;
      }

      setIsLoadingDeepLink(true);
      try {
        const url = new URL(
          `/api/festivals/${festivalSlug}/results`,
          window.location.origin,
        );
        url.searchParams.set("programmeId", programmeId);
        url.searchParams.set("pageSize", "1");
        const response = await fetch(url);
        const body = await response.json();
        const programme = body?.data?.programmes?.[0];
        if (programme) setSelectedProgram(programme);
      } catch {
        // A dead deep link simply leaves the dialog closed.
      } finally {
        setIsLoadingDeepLink(false);
      }
    },
    [programmes, festivalSlug],
  );

  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current) return;
    const programmeId = searchParams.get("programmeId");
    if (!programmeId) return;
    deepLinkHandled.current = true;
    void openProgrammeById(programmeId, searchParams.get("template"));
  }, [searchParams, openProgrammeById]);

  const teamStandings = (initialTeamStandings ?? []).map((team, index) => ({
    ...team,
    rank: team.rank || index + 1,
  }));

  return (
    <PublicSection className="min-h-[60vh]">
      <div>
        {/* Header */}
        <div className="max-w-2xl text-left">
          <p className="text-eyebrow justify-start mb-3">
            <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-primary" />
            Live results
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-[2rem] font-semibold tracking-tight text-heading text-balance">
            {activeTab === "program" ? "Programme results" : "Team standings"}
          </h1>
          <p className="mt-2.5 text-[15px] text-muted-foreground leading-relaxed">
            {activeTab === "program"
              ? "Published results, updating as programmes are announced."
              : `Team points status across ${festivalName}.`}
          </p>
        </div>

        {/* Views */}
        <div
          role="tablist"
          aria-label="Result views"
          className="mt-8 flex gap-1 border-b border-border"
        >
          {(
            [
              { id: "program", label: "By programme" },
              { id: "team", label: "By team" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-heading"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.span
                  layoutId="results-tab-underline"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                  style={{ backgroundColor: accentColor }}
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
              )}
            </button>
          ))}
        </div>

        {activeTab === "program" ? (
          <div className="pt-8">
            {/* Search & filter */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                {isRefiltering ? (
                  <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : (
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  placeholder="Search programmes"
                  className="h-10 rounded-full border-transparent bg-muted/60 pl-9 text-sm focus-visible:border-border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="scrollbar-hide flex shrink-0 gap-1 overflow-x-auto">
                {(["ALL", "INDIVIDUAL", "GROUP"] as const).map((type) => {
                  const isActive = programTypeFilter === type;
                  return (
                    <button
                      type="button"
                      key={type}
                      aria-pressed={isActive}
                      onClick={() => setProgramTypeFilter(type)}
                      className={cn(
                        "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                        isActive
                          ? "text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground",
                      )}
                      style={
                        isActive ? { backgroundColor: accentColor } : undefined
                      }
                    >
                      {type === "ALL"
                        ? "All"
                        : type === "INDIVIDUAL"
                          ? "Individual"
                          : "Group"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Programme rows */}
            {programmes.length > 0 ? (
              <>
                <ul
                  className={cn(
                    "divide-y divide-border border-y border-border transition-opacity",
                    isRefiltering && "opacity-50",
                  )}
                >
                  {programmes.map((programme, idx) => {
                    const first = programme.results[0];
                    return (
                      <motion.li
                        key={programme.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.35,
                          delay: Math.min(idx % PAGE_SIZE, 10) * 0.03,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedProgram(programme)}
                          className="group flex w-full items-center gap-3 py-4 text-left"
                        >
                          {programme.resultNumber ? (
                            <div className="flex w-5 shrink-0 justify-center">
                              <div
                                className="text-[13px] font-bold text-muted-foreground/50 tracking-widest"
                                style={{
                                  writingMode: "vertical-rl",
                                  transform: "rotate(180deg)",
                                }}
                              >
                                #{programme.resultNumber}
                              </div>
                            </div>
                          ) : (
                            <div className="w-5 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-[15px] font-medium text-heading transition-opacity group-hover:opacity-70">
                              {programme.name}
                            </h3>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {programme.category} ·{" "}
                              {programme.type === "GROUP"
                                ? "Team"
                                : "Individual"}
                            </p>
                          </div>

                          {first && (
                            <p className="hidden max-w-[38%] shrink-0 truncate text-right text-sm text-muted-foreground sm:block">
                              <span className="text-heading">
                                {first.winner}
                              </span>
                            </p>
                          )}

                          <ChevronRight
                            className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                            style={{ color: accentColor }}
                          />
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>

                {Math.ceil(total / PAGE_SIZE) > 1 && (
                  <div className="mt-8 flex justify-center pb-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={(e) => {
                              e.preventDefault();
                              if (page > 1) goToPage(page - 1);
                            }}
                            className={
                              page <= 1 ? "pointer-events-none opacity-50" : ""
                            }
                          />
                        </PaginationItem>

                        {[...Array(Math.ceil(total / PAGE_SIZE))].map(
                          (_, i) => {
                            const targetPage = i + 1;
                            const totalPages = Math.ceil(total / PAGE_SIZE);

                            if (
                              targetPage === 1 ||
                              targetPage === totalPages ||
                              (targetPage >= page - 1 && targetPage <= page + 1)
                            ) {
                              return (
                                <PaginationItem key={i}>
                                  <PaginationLink
                                    isActive={page === targetPage}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      goToPage(targetPage);
                                    }}
                                  >
                                    {targetPage}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            }

                            if (
                              targetPage === page - 2 ||
                              targetPage === page + 2
                            ) {
                              return (
                                <PaginationItem key={i}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }

                            return null;
                          },
                        )}

                        <PaginationItem>
                          <PaginationNext
                            onClick={(e) => {
                              e.preventDefault();
                              if (page < Math.ceil(total / PAGE_SIZE))
                                goToPage(page + 1);
                            }}
                            className={
                              page >= Math.ceil(total / PAGE_SIZE)
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
            ) : (
              <EmptyState>
                {searchQuery.trim()
                  ? `No programmes match “${searchQuery.trim()}”.`
                  : "No results published yet."}
              </EmptyState>
            )}
          </div>
        ) : (
          <motion.div
            key="team-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="pt-8"
          >
            <TeamStandingsSection
              standings={teamStandings}
              accentColor={accentColor}
              bare
            />
          </motion.div>
        )}

        {/* Programme detail */}
        <Dialog
          open={!!selectedProgram || isLoadingDeepLink}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedProgram(null);
              setSelectedTemplateCode(null);
            }
          }}
        >
          <DialogContent className="flex max-h-[88vh] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
            {selectedProgram ? (
              <>
                <DialogHeader className="bg-muted/30 border-b border-border p-6 pb-5 text-left">
                  <div className="flex items-center gap-4">
                    {selectedProgram.resultNumber && (
                      <div className="text-4xl font-black tracking-tighter text-primary">
                        #{selectedProgram.resultNumber}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {selectedProgram.category} ·{" "}
                        {selectedProgram.type === "GROUP"
                          ? "Team"
                          : "Individual"}
                      </p>
                      <DialogTitle className="text-lg font-semibold tracking-tight text-heading sm:text-xl">
                        {selectedProgram.name}
                      </DialogTitle>
                    </div>
                  </div>
                </DialogHeader>

                <ScrollArea className="flex-1 overflow-y-auto px-6 py-5">
                  <ol className="flex flex-col gap-2.5">
                    {selectedProgram.results
                      .filter((r) => r.position >= 1 && r.position <= 3)
                      .sort((a, b) => a.position - b.position)
                      .map((result) => {
                        let badgeClass = "";
                        let rowClass = "";
                        let nameClass = "";
                        let teamClass = "";
                        let icon = null;
                        let placeLabel = "";

                        switch (result.position) {
                          case 1:
                            badgeClass =
                              "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400";
                            rowClass =
                              "bg-amber-50/40 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-900/30";
                            nameClass =
                              "text-amber-950 dark:text-amber-100 font-semibold";
                            teamClass =
                              "text-amber-700/80 dark:text-amber-400/70";
                            icon = <Trophy className="h-4 w-4" />;
                            placeLabel = "1st Place";
                            break;
                          case 2:
                            badgeClass =
                              "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
                            rowClass =
                              "bg-slate-50/50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800";
                            nameClass =
                              "text-slate-900 dark:text-slate-100 font-medium";
                            teamClass = "text-slate-500 dark:text-slate-400";
                            icon = <Medal className="h-4 w-4" />;
                            placeLabel = "2nd Place";
                            break;
                          case 3:
                            badgeClass =
                              "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400";
                            rowClass =
                              "bg-orange-50/40 dark:bg-orange-900/10 border-orange-200/60 dark:border-orange-900/30";
                            nameClass =
                              "text-orange-950 dark:text-orange-100 font-medium";
                            teamClass =
                              "text-orange-700/80 dark:text-orange-400/70";
                            icon = <Medal className="h-4 w-4" />;
                            placeLabel = "3rd Place";
                            break;
                          default:
                            badgeClass = "bg-muted text-muted-foreground";
                            rowClass = "bg-transparent border-border";
                            nameClass = "text-heading font-medium text-sm";
                            teamClass = "text-muted-foreground";
                            icon = (
                              <span className="text-sm font-bold">
                                {result.position}
                              </span>
                            );
                            placeLabel = `${result.position}th Place`;
                        }

                        return (
                          <li
                            key={result.id}
                            className={cn(
                              "flex items-center gap-3.5 rounded-xl border px-4 py-3 transition-colors",
                              rowClass,
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                                badgeClass,
                              )}
                            >
                              {icon}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "truncate text-[15px]",
                                  nameClass,
                                )}
                              >
                                {result.winner}
                              </p>
                              <p
                                className={cn(
                                  "mt-0.5 truncate text-xs",
                                  teamClass,
                                )}
                              >
                                {[
                                  result.team,
                                  result.codeLetter
                                    ? `Code ${result.codeLetter}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <div
                                className={cn(
                                  "text-[10px] font-bold uppercase tracking-widest",
                                  teamClass,
                                )}
                              >
                                {placeLabel}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                  </ol>
                  <div className="mt-5">
                    <PublicResultPosterSection
                      programmeId={selectedProgram.id}
                      festivalSlug={festivalSlug}
                      initialTemplateCode={selectedTemplateCode ?? undefined}
                    />
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex min-h-[240px] items-center justify-center">
                <DialogTitle className="sr-only">Loading result</DialogTitle>
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PublicSection>
  );
}
