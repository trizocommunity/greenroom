"use client";

import { motion } from "framer-motion";
import { ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Result {
  id: string;
  programName: string;
  winner: string;
  team: string; // Group name
  position: number;
}

interface ResultsTeaserProps {
  accentColor: string;
  slug: string;
  results: Result[];
}

export function ResultsTeaser({
  accentColor,
  slug,
  results,
}: ResultsTeaserProps) {
  // Filter for actual positions
  const rankedResults = results.filter((r) => r.position > 0);
  const topResult = rankedResults.find((r) => r.position === 1);
  const runnersUp = rankedResults
    .filter((r) => r.position > 1)
    .sort((a, b) => a.position - b.position)
    .slice(0, 2);

  if (!topResult && runnersUp.length === 0) {
    return null; // Don't show if no results
  }

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Background decoration */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          background: `radial-gradient(circle at 80% 20%, ${accentColor}, transparent 50%)`,
        }}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 text-xs font-medium mb-6">
              <Trophy className="w-3.5 h-3.5" />
              <span>Latest updates</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-heading mb-5">
              Transparent results, live and shareable
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed text-pretty">
              Follow every placement as it happens. Greenroom keeps scores,
              tiebreakers, and rankings in sync for organizers and teams.
            </p>
            <Link href={`/${slug}/results`}>
              <Button
                size="lg"
                className="rounded-full font-medium shadow-primary-glow"
                style={{ backgroundColor: accentColor }}
              >
                View full results <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>

          {/* Right Side: Showcase */}
          <div className="grid gap-3">
            {/* If no top result but have others, just show list. If top result exists, show big card. */}
            {topResult ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl bg-card border border-border shadow-premium-lg relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-[0.06]">
                  <Trophy className="w-24 h-24 text-yellow-500" />
                </div>
                <div className="relative">
                  <span className="text-sm font-medium text-muted-foreground">
                    {topResult.programName}
                  </span>
                  <h3 className="text-2xl font-semibold tracking-tight text-heading mt-1 mb-2">
                    Winner: {topResult.winner}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Team:</span>
                    <p
                      className="font-semibold text-lg"
                      style={{ color: accentColor }}
                    >
                      {topResult.team}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {/* Runners Up */}
            {runnersUp.map((result, i) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                viewport={{ once: true }}
                className="p-5 rounded-xl bg-card border border-border flex items-center justify-between hover:border-primary/30 transition-colors"
              >
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {result.programName}
                  </p>
                  <p className="font-semibold text-base text-heading">
                    {result.winner}
                  </p>
                  <p className="text-xs text-muted-foreground">{result.team}</p>
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-semibold text-sm text-foreground">
                  #{result.position}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
