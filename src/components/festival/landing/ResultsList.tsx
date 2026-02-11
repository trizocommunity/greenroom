"use client";

import { motion } from "framer-motion";
import { Medal, Trophy } from "lucide-react";

export interface Result {
  id: string;
  programmeId: string;
  programName: string;
  programmeType: "INDIVIDUAL" | "GROUP";
  category: string;
  winner: string;
  team: string;
  position: number;
  points: number;
  grade?: string | null;
  score?: number | null;
}

interface ResultsListProps {
  festivalName: string;
  accentColor: string;
  results: Result[];
}

export function ResultsList({
  festivalName,
  accentColor,
  results,
}: ResultsListProps) {
  // Group results by Programme ID (not name) to handle same-named programmes in different categories
  const resultsByProgram = results.reduce(
    (acc, result) => {
      // Use programmeId as key to avoid merging same-named programmes
      const key = result.programmeId;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    },
    {} as Record<string, Result[]>,
  );

  return (
    <section
      id="results"
      className="py-12 px-4 md:px-6 max-w-7xl mx-auto space-y-12 min-h-[50vh]"
    >
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
          Competition Results
        </h2>
        <p className="text-muted-foreground">
          Detailed standings of all completed events at {festivalName}.
        </p>
      </div>

      {Object.keys(resultsByProgram).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl bg-muted/20">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No results published yet.</p>
          <p className="text-sm mt-2">
            Results will be displayed here once they are published.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(resultsByProgram).map(
            ([programmeId, programResults], index) => (
              <motion.div
                key={programmeId} // Use programmeId as key
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="border rounded-xl bg-card shadow-sm overflow-hidden"
              >
                <div
                  className="p-4 border-b font-semibold text-lg bg-muted/30 flex items-center justify-between"
                  style={{ borderLeft: `4px solid ${accentColor}` }}
                >
                  <span
                    className="truncate"
                    title={programResults[0].programName}
                  >
                    {programResults[0].programName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-background rounded border text-muted-foreground">
                      {programResults[0].category}
                    </span>
                    {programResults[0].programmeType === "GROUP" && (
                      <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded border border-primary/20 font-medium">
                        GROUP
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {programResults
                    .sort((a, b) => a.position - b.position)
                    .map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 flex justify-center shrink-0">
                            {result.position === 1 ? (
                              <Trophy className="w-5 h-5 text-yellow-500 drop-shadow-sm" />
                            ) : result.position === 2 ? (
                              <Medal className="w-5 h-5 text-gray-400" />
                            ) : result.position === 3 ? (
                              <Medal className="w-5 h-5 text-amber-700" />
                            ) : (
                              <span className="text-sm font-bold text-muted-foreground">
                                {result.position}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate text-sm">
                              {result.winner}
                              {result.grade && (
                                <span className="ml-2 text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                  {result.grade}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {programResults[0].programmeType === "GROUP"
                                ? result.team
                                : `${result.team}`}
                              {result.score && (
                                <span className="ml-2">
                                  • {result.score} marks
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span
                            className="font-mono text-sm font-bold"
                            style={{ color: accentColor }}
                          >
                            {result.points} pts
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>
            ),
          )}
        </div>
      )}
    </section>
  );
}
