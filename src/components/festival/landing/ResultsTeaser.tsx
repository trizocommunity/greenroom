"use client";

import { motion } from "framer-motion";
import { ArrowRight, Medal, Trophy } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MOCK_RESULTS } from "@/data/mockFestivalData";

interface ResultsTeaserProps {
  accentColor: string;
  slug: string;
}

export function ResultsTeaser({ accentColor, slug }: ResultsTeaserProps) {
  const topResult = MOCK_RESULTS.find((r) => r.position === 1);
  const runnersUp = MOCK_RESULTS.filter((r) => r.position > 1).slice(0, 2);

  return (
    <section className="py-24 relative overflow-hidden bg-dot-pattern">
      {/* Background decoration */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 text-sm font-medium mb-6">
              <Trophy className="w-4 h-4" />
              <span>Latest Updates</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Celebrating Excellence
            </h2>
            <p className="text-lg text-muted-foreground mb-8 text-pretty">
              The results are rolling in! Witness the triumphs and celebrations
              as teams compete for the championship.
            </p>
            <Link href={`/festival/${slug}/results`}>
              <Button
                size="lg"
                className="rounded-full"
                style={{ backgroundColor: accentColor }}
              >
                View Full Results <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid gap-4">
            {/* Winner Card */}
            {topResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl bg-background border border-border shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Trophy className="w-24 h-24 text-yellow-500" />
                </div>
                <div className="relative">
                  <span className="text-sm font-medium text-muted-foreground">
                    {topResult.programName}
                  </span>
                  <h3 className="text-2xl font-bold mt-1 mb-2">
                    Winner: {topResult.winner}
                  </h3>
                  <p
                    className="font-medium text-lg"
                    style={{ color: accentColor }}
                  >
                    {topResult.team}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Runners Up */}
            {runnersUp.map((result, i) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                viewport={{ once: true }}
                className="p-5 rounded-xl bg-muted/50 border border-border flex items-center justify-between"
              >
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {result.programName}
                  </p>
                  <p className="font-semibold">{result.winner}</p>
                  <p className="text-sm text-muted-foreground">{result.team}</p>
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border shadow-sm font-bold text-sm">
                  {result.position}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
