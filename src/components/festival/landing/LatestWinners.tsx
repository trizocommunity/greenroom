"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  PublicSection,
  SectionHeader,
} from "@/components/festival/public/PublicSection";

export interface LatestResult {
  id: string;
  programName: string;
  winner: string;
  team: string;
}

/**
 * The most recent first places, as a list of rows. No cards, no thumbnails —
 * the winner's name is the only thing that needs to be large.
 */
export function LatestWinners({
  slug,
  results,
  accentColor = "var(--primary)",
}: {
  slug: string;
  results: LatestResult[];
  accentColor?: string;
}) {
  if (results.length === 0) return null;

  return (
    <PublicSection bordered>
      <SectionHeader eyebrow="Results" title="Latest wins" className="mb-8" />

      <ol className="divide-y divide-border border-y border-border">
        {results.map((result, i) => (
          <motion.li
            key={result.id}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4"
          >
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight text-heading">
                {result.winner}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {result.team}
              </p>
            </div>
            <p
              className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: accentColor }}
            >
              {result.programName}
            </p>
          </motion.li>
        ))}
      </ol>

      <Link
        href={`/${slug}/results`}
        className="group mt-5 inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
        style={{ color: accentColor }}
      >
        All results
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </PublicSection>
  );
}
