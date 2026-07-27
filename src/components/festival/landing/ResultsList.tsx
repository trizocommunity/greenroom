"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Crown, Medal, Search, Trophy } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PublicResultPosterSection } from "@/components/festival/posters/PublicResultPosterSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/core/utils/cn";

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
  grade?: string | null;
  codeLetter?: string | null;
}

export interface TeamStanding {
  name: string;
  points: number;
  rank?: number;
  isGroup?: boolean;
}

interface ResultsListProps {
  festivalId?: string;
  festivalName: string;
  festivalSlug?: string;
  accentColor: string; // We'll essentially use this as the primary active color
  results: Result[];
  teamStandings?: TeamStanding[];
  publicDisplayMode?: "programme_results" | "team_standings";
  scoringSystem?: "POSITION_BASED" | "SCORE_BASED";
}

export function ResultsList({
  festivalId,
  festivalName,
  accentColor,
  results,
  teamStandings: initialTeamStandings,
  publicDisplayMode = "programme_results",
  festivalSlug,
}: ResultsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const standingsOnly = publicDisplayMode === "team_standings";
  const [activeTab, setActiveTab] = useState<"program" | "team">(
    standingsOnly ? "team" : "program",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [programTypeFilter, setProgramTypeFilter] = useState<
    "ALL" | "INDIVIDUAL" | "GROUP"
  >("ALL");
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<
    string | null
  >(null);

  const openProgramDialog = useCallback(
    (programmeId: string, templateCode?: string | null) => {
      setSelectedProgram(programmeId);
      setSelectedTemplateCode(templateCode ?? null);
    },
    [],
  );

  // Polling refresh every 15 seconds for updates
  useEffect(() => {
    if (!festivalId) return;
    const id = window.setInterval(() => {
      router.refresh();
    }, 15000);
    return () => window.clearInterval(id);
  }, [festivalId, router]);

  // Honour ?programmeId&template deep links from shared posters
  useEffect(() => {
    if (standingsOnly) return;
    const programmeId = searchParams.get("programmeId");
    if (!programmeId) return;
    const template = searchParams.get("template");
    openProgramDialog(programmeId, template);
  }, [searchParams, openProgramDialog, standingsOnly]);

  // --- Data Processing ---

  // 1. Group results by Programme ID
  const resultsByProgram = useMemo(() => {
    return results.reduce(
      (acc, result) => {
        const key = result.programmeId;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(result);
        return acc;
      },
      {} as Record<string, Result[]>,
    );
  }, [results]);

  // 2. Convert to array for searching & display
  const programs = useMemo(() => {
    return Object.values(resultsByProgram).map((progResults) => {
      const first = progResults[0];
      return {
        id: first.programmeId,
        name: first.programName,
        category: first.category,
        type: first.programmeType,
        results: progResults.sort((a, b) => a.position - b.position),
      };
    });
  }, [resultsByProgram]);

  // 3. Filter Programs
  const filteredPrograms = useMemo(() => {
    let filtered = programs;

    // Filter by Type
    if (programTypeFilter !== "ALL") {
      filtered = filtered.filter((p) => p.type === programTypeFilter);
    }

    // Filter by Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.category.toLowerCase().includes(lowerQuery),
      );
    }
    return filtered;
  }, [programs, searchQuery, programTypeFilter]);

  // 4. Calculate Team Points (or use provided snapshot)
  const teamStandings = useMemo(() => {
    if (initialTeamStandings && initialTeamStandings.length > 0) {
      return initialTeamStandings.map((team, index) => ({
        ...team,
        rank: team.rank || index + 1,
      }));
    }

    if (standingsOnly) {
      return [];
    }

    const standings: Record<string, { name: string; points: number }> = {};

    results.forEach((r) => {
      // Only count valid points; assume `team` is the group name
      // If team is empty or null, skip? The Interface says string.
      if (!r.team) return;

      if (!standings[r.team]) {
        standings[r.team] = { name: r.team, points: 0 };
      }
      standings[r.team].points += r.points;
    });

    return Object.values(standings)
      .sort((a, b) => b.points - a.points)
      .map((team, index) => ({ ...team, rank: index + 1 }));
  }, [results, initialTeamStandings, standingsOnly]);

  useEffect(() => {
    if (standingsOnly) setActiveTab("team");
  }, [standingsOnly]);

  // --- UI Helpers ---

  // Helper for ordinal suffix (1st, 2nd, 3rd)
  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <section className="min-h-[60vh] space-y-6 sm:space-y-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-6 py-8 sm:py-12 lg:py-24">
        {/* Header Section */}
        <div className="space-y-4">
          <p className="text-eyebrow">Live results</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-heading">
            {activeTab === "program" ? `Program results` : `Team status`}
          </h1>
          <p className="text-muted-foreground">
            {activeTab === "program" ? (
              <>
                Published results for{" "}
                <span className="font-medium text-foreground">
                  {festivalName}
                </span>
              </>
            ) : (
              <>
                Team points status for{" "}
                <span className="font-medium text-foreground">
                  {festivalName}
                </span>
              </>
            )}
          </p>

          {/* Tabs - Creating custom segmented control look */}
          <div className="flex gap-2 pt-2">
            {!standingsOnly && (
              <button
                type="button"
                onClick={() => setActiveTab("program")}
                className={cn(
                  "px-5 py-2 rounded-full font-medium text-sm transition-all duration-200",
                  activeTab === "program"
                    ? "text-white shadow-premium"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
                style={{
                  backgroundColor:
                    activeTab === "program" ? accentColor : undefined,
                }}
              >
                Program
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("team")}
              className={cn(
                "px-5 py-2 rounded-full font-medium text-sm transition-all duration-200",
                activeTab === "team"
                  ? "text-white shadow-premium"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
              style={{
                backgroundColor: activeTab === "team" ? accentColor : undefined,
              }}
            >
              Team
            </button>
          </div>
        </div>
        <AnimatePresence mode="wait">
          {activeTab === "program" ? (
            <motion.div
              key="program-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Search & Filter Bar */}
              <div className="flex flex-col md:flex-row gap-4 pt-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by program or category..."
                    className="pl-10 h-11 rounded-lg bg-card border-border transition-all focus:ring-2"
                    style={{ "--ring": accentColor } as React.CSSProperties}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Programme Type Filter */}
                <div className="flex bg-muted p-1 rounded-full shrink-0">
                  {(["ALL", "INDIVIDUAL", "GROUP"] as const).map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setProgramTypeFilter(type)}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-medium transition-all",
                        programTypeFilter === type
                          ? "bg-background shadow-premium text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {type === "ALL"
                        ? "All"
                        : type === "INDIVIDUAL"
                          ? "Individual"
                          : "Group"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Program Grid */}
              {filteredPrograms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPrograms.map((program, idx) => (
                    <motion.div
                      key={program.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => openProgramDialog(program.id)}
                      className="group relative bg-card hover:border-primary/30 cursor-pointer border border-border rounded-xl p-4 flex items-center gap-4 shadow-premium hover:shadow-premium-lg transition-all duration-300 border-l-4"
                      style={{
                        borderLeftColor:
                          idx % 2 === 0 ? accentColor : undefined,
                      }} // Optional: alternate border colors or keep distinct
                    >
                      {/* Number Circle */}
                      <div className="w-9 h-9 rounded-full bg-muted text-foreground font-semibold text-sm flex items-center justify-center shrink-0 group-hover:bg-primary/8 group-hover:text-primary transition-colors">
                        {idx + 1}
                      </div>

                      {/* Text Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-base truncate tracking-tight text-heading">
                            {program.name}
                          </h3>
                          <Badge
                            variant={
                              program.type === "GROUP" ? "secondary" : "outline"
                            }
                            className="text-[10px] font-normal"
                          >
                            {program.type === "GROUP" ? "Team" : "Individual"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {program.category}
                        </p>
                      </div>

                      {/* Chevron for affordance */}
                      <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors" />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  <p>No programs found matching "{searchQuery}"</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="team-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-12"
            >
              {/* Top 3 Teams (Podium) */}
              {teamStandings.length > 0 && (
                <div className="text-center space-y-8">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <h2 className="text-2xl font-semibold tracking-tight text-heading flex items-center gap-2">
                      <Crown className="w-6 h-6 text-yellow-500 fill-current" />
                      Final status
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Live team point status
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-end">
                    {/* 2nd Place (Silver) */}
                    {teamStandings[1] && (
                      <div className="order-2 md:order-1 bg-card border-t-4 border-border rounded-2xl p-6 shadow-premium transform hover:-translate-y-1 transition-transform duration-300">
                        <div className="flex justify-center mb-4">
                          <Medal className="w-9 h-9 text-gray-400" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2 truncate text-heading">
                          {teamStandings[1].name}
                        </h3>
                        <div className="text-3xl font-semibold tracking-tight text-foreground mb-2">
                          {teamStandings[1].points}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          #2 position — first runners-up
                        </div>
                      </div>
                    )}

                    {/* 1st Place (Gold) */}
                    {teamStandings[0] && (
                      <div className="order-1 md:order-2 bg-card border-t-4 border-yellow-500 rounded-2xl p-8 shadow-premium-lg transform md:scale-105 hover:-translate-y-1 transition-transform duration-300 z-10">
                        <div className="flex justify-center mb-4">
                          <Crown className="w-11 h-11 text-yellow-500 fill-yellow-400/60" />
                        </div>
                        <h3 className="font-semibold text-xl mb-2 truncate text-heading">
                          {teamStandings[0].name}
                        </h3>
                        <div className="text-4xl font-semibold tracking-tight text-primary mb-2">
                          {teamStandings[0].points}
                        </div>
                        <div className="text-xs font-medium text-yellow-700 bg-yellow-100 inline-block px-3 py-1 rounded-full">
                          #1 position — champions
                        </div>
                      </div>
                    )}

                    {/* 3rd Place (Bronze) */}
                    {teamStandings[2] && (
                      <div className="order-3 md:order-3 bg-card border-t-4 border-orange-400 rounded-2xl p-6 shadow-premium transform hover:-translate-y-1 transition-transform duration-300">
                        <div className="flex justify-center mb-4">
                          <Medal className="w-9 h-9 text-orange-500" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2 truncate text-heading">
                          {teamStandings[2].name}
                        </h3>
                        <div className="text-3xl font-semibold tracking-tight text-foreground mb-2">
                          {teamStandings[2].points}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          #3 position — second runners-up
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Other Teams */}
              {teamStandings.length > 3 && (
                <div className="space-y-4">
                  <h3 className="text-center text-lg font-semibold tracking-tight text-heading">
                    Other teams
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {teamStandings.slice(3).map((team) => (
                      <div
                        key={team.name}
                        className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-premium hover:shadow-premium-lg transition-all"
                      >
                        <h4 className="font-medium text-sm truncate w-full mb-2 text-heading">
                          {team.name}
                        </h4>
                        <div className="text-2xl font-semibold tracking-tight text-primary mb-1">
                          {team.points}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          #{team.rank} position
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {teamStandings.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                  No results available yet.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {/* Program Details Modal */}
        <Dialog
          open={!!selectedProgram}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedProgram(null);
              setSelectedTemplateCode(null);
            }
          }}
        >
          <DialogContent className="max-w-md md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
            {(() => {
              const program = programs.find((p) => p.id === selectedProgram);
              if (!program) return null;

              return (
                <>
                  <DialogHeader className="p-6 pb-2 border-b bg-muted/10">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className="uppercase text-[10px] tracking-widest"
                      >
                        {program.category}
                      </Badge>
                      <Badge
                        variant={
                          program.type === "GROUP" ? "secondary" : "outline"
                        }
                        className="uppercase text-[10px]"
                      >
                        {program.type === "GROUP" ? "Team" : "Individual"}
                      </Badge>
                    </div>
                    <DialogTitle className="text-xl md:text-2xl font-semibold tracking-tight text-heading">
                      {program.name}
                    </DialogTitle>
                    <DialogDescription>
                      Basic result view: Rank, Team, Code, Grade, Points
                    </DialogDescription>
                  </DialogHeader>

                  <ScrollArea className="flex-1 overflow-y-auto p-6 bg-card">
                    <div className="space-y-3">
                      {festivalSlug && (
                        <PublicResultPosterSection
                          programmeId={program.id}
                          festivalSlug={festivalSlug}
                          initialTemplateCode={
                            selectedTemplateCode ?? undefined
                          }
                        />
                      )}
                      {program.results.map((result, _idx) => {
                        const isTop3 = result.position <= 3;
                        return (
                          <div
                            key={result.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border",
                              isTop3
                                ? "bg-accent/5 border-accent/20"
                                : "bg-background border-border",
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                  result.position === 1
                                    ? "bg-yellow-100 text-yellow-700"
                                    : result.position === 2
                                      ? "bg-gray-100 text-gray-700"
                                      : result.position === 3
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-muted text-muted-foreground",
                                )}
                              >
                                {result.position}
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  Team
                                </p>
                                <p className="font-bold text-sm">
                                  {result.winner}
                                </p>
                                {result.codeLetter ? (
                                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                    Code {result.codeLetter}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className="font-mono font-bold text-sm"
                                style={{ color: accentColor }}
                              >
                                {result.points} pts
                              </div>
                              <div className="flex items-center justify-end gap-2 mt-1">
                                {result.grade && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-green-100 text-green-700 rounded border border-green-200">
                                    {result.grade}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
