"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trophy, Medal, Crown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  score?: number;
  grade?: string | null;
}

export interface TeamStanding {
  name: string;
  points: number;
  rank?: number;
  isGroup?: boolean;
}

interface ResultsListProps {
  festivalName: string;
  accentColor: string; // We'll essentially use this as the primary active color
  results: Result[];
  teamStandings?: TeamStanding[];
  scoringSystem?: "POSITION_BASED" | "SCORE_BASED";
}

export function ResultsList({
  festivalName,
  accentColor,
  results,
  teamStandings: initialTeamStandings,
}: ResultsListProps) {
  const [activeTab, setActiveTab] = useState<"program" | "team">("program");
  const [searchQuery, setSearchQuery] = useState("");
  const [programTypeFilter, setProgramTypeFilter] = useState<
    "ALL" | "INDIVIDUAL" | "GROUP"
  >("ALL");
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

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
  }, [results, initialTeamStandings]);

  // --- UI Helpers ---

  // Helper for ordinal suffix (1st, 2nd, 3rd)
  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <section className="min-h-[60vh] space-y-8">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-12 lg:py-24">
        {/* Header Section */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            {activeTab === "program" ? `Program Results` : `Team Status`}
          </h1>
          <p className="text-muted-foreground font-medium">
            {activeTab === "program" ? (
              <>
                Published results for{" "}
                <span className="font-bold text-foreground">{festivalName}</span>
              </>
            ) : (
              <>
                Team points status for{" "}
                <span className="font-bold text-foreground">{festivalName}</span>
              </>
            )}
          </p>

          {/* Tabs - Creating custom segmented control look */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("program")}
              className={cn(
                "px-6 py-2 rounded-lg font-bold text-sm transition-all duration-200 shadow-sm",
                activeTab === "program"
                  ? "text-white shadow-md scale-105"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
              style={{
                backgroundColor:
                  activeTab === "program" ? accentColor : undefined,
              }}
            >
              Program
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("team")}
              className={cn(
                "px-6 py-2 rounded-lg font-bold text-sm transition-all duration-200 shadow-sm",
                activeTab === "team"
                  ? "text-white shadow-md scale-105"
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
                    placeholder="Search by program or category.."
                    className="pl-10 h-11 bg-card shadow-sm border-muted transition-all focus:ring-2"
                    style={{ "--ring": accentColor } as React.CSSProperties}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Programme Type Filter */}
                <div className="flex bg-muted p-1 rounded-lg shrink-0">
                  {(["ALL", "INDIVIDUAL", "GROUP"] as const).map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setProgramTypeFilter(type)}
                      className={cn(
                        "px-4 py-2 rounded-md text-xs font-bold transition-all",
                        programTypeFilter === type
                          ? "bg-background shadow-sm text-foreground"
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
                      onClick={() => setSelectedProgram(program.id)}
                      className="group relative bg-card hover:bg-accent/5 cursor-pointer border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300 border-l-4"
                      style={{
                        borderLeftColor: idx % 2 === 0 ? accentColor : undefined,
                      }} // Optional: alternate border colors or keep distinct
                    >
                      {/* Number Circle */}
                      <div className="w-10 h-10 rounded-full bg-foreground text-background font-bold text-lg flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                        {idx + 1}
                      </div>

                      {/* Text Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base truncate uppercase tracking-tight text-foreground/90 group-hover:text-foreground">
                          {program.name}
                        </h3>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {program.category}
                        </p>
                      </div>

                      {/* Chevron for affordance */}
                      <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-foreground/50 transition-colors" />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-muted-foreground/20">
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
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Crown className="w-6 h-6 text-yellow-500 fill-current" />
                      Final Status
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Live Team Point Status
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-end">
                    {/* 2nd Place (Silver) */}
                    {teamStandings[1] && (
                      <div className="order-2 md:order-1 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-900 border-t-4 border-gray-400 rounded-2xl p-6 shadow-lg transform hover:-translate-y-2 transition-transform duration-300">
                        <div className="flex justify-center mb-4">
                          <Medal className="w-10 h-10 text-gray-500" />
                        </div>
                        <h3 className="font-bold text-lg mb-2 truncate">
                          {teamStandings[1].name}
                        </h3>
                        <div className="text-4xl font-black text-gray-600 dark:text-gray-300 mb-2">
                          {teamStandings[1].points}
                        </div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          #2 Position - First Runners-up
                        </div>
                      </div>
                    )}

                    {/* 1st Place (Gold) */}
                    {teamStandings[0] && (
                      <div className="order-1 md:order-2 bg-gradient-to-b from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/10 border-t-4 border-yellow-500 rounded-2xl p-8 shadow-xl transform scale-105 hover:-translate-y-2 transition-transform duration-300 z-10">
                        <div className="flex justify-center mb-4">
                          <Crown className="w-12 h-12 text-yellow-600 fill-yellow-400" />
                        </div>
                        <h3 className="font-bold text-xl mb-2 truncate">
                          {teamStandings[0].name}
                        </h3>
                        <div className="text-5xl font-black text-red-600 dark:text-red-500 mb-2 drop-shadow-sm">
                          {teamStandings[0].points}
                        </div>
                        <div className="text-sm font-bold text-yellow-700 dark:text-yellow-500 uppercase tracking-wider bg-yellow-200 dark:bg-yellow-900/50 inline-block px-3 py-1 rounded-full">
                          #1 Position - Champions
                        </div>
                      </div>
                    )}

                    {/* 3rd Place (Bronze) */}
                    {teamStandings[2] && (
                      <div className="order-3 md:order-3 bg-gradient-to-b from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 border-t-4 border-orange-400 rounded-2xl p-6 shadow-lg transform hover:-translate-y-2 transition-transform duration-300">
                        <div className="flex justify-center mb-4">
                          <Medal className="w-10 h-10 text-orange-600" />
                        </div>
                        <h3 className="font-bold text-lg mb-2 truncate">
                          {teamStandings[2].name}
                        </h3>
                        <div className="text-4xl font-black text-orange-800 dark:text-orange-400 mb-2">
                          {teamStandings[2].points}
                        </div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          #3 Position - Second Runners-up
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Other Teams */}
              {teamStandings.length > 3 && (
                <div className="space-y-4">
                  <h3 className="text-center text-lg font-bold text-muted-foreground">
                    Other Teams
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {teamStandings.slice(3).map((team) => (
                      <div
                        key={team.name}
                        className="bg-card border rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all hover:bg-muted/30"
                      >
                        <h4 className="font-bold text-sm truncate w-full mb-2">
                          {team.name}
                        </h4>
                        <div className="text-3xl font-black text-red-600/80 mb-1">
                          {team.points}
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">
                          #{team.rank} Position
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
          onOpenChange={(open) => !open && setSelectedProgram(null)}
        >
          <DialogContent className="max-w-md md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
            {(() => {
              const program = programs.find((p) => p.id === selectedProgram);
              if (!program) return null;

              return (
                <>
                  <DialogHeader className="p-6 pb-2 border-b bg-muted/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className="uppercase text-[10px] tracking-widest"
                      >
                        {program.category}
                      </Badge>
                    </div>
                    <DialogTitle className="text-xl md:text-2xl font-bold uppercase">
                      {program.name}
                    </DialogTitle>
                    <DialogDescription>
                      Full results list (Top performes & Grades)
                    </DialogDescription>
                  </DialogHeader>

                  <ScrollArea className="flex-1 overflow-y-auto p-6 bg-card">
                    <div className="space-y-3">
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
                                <p className="font-bold text-sm">
                                  {result.winner}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {result.team}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className="font-mono font-bold text-sm"
                                style={{ color: accentColor }}
                              >
                                {result.points} pts
                              </div>
                              {result.score !== undefined && (
                                <div className="text-xs text-muted-foreground font-medium mb-1">
                                  Score: {result.score}
                                </div>
                              )}
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
