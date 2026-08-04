"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  EmptyState,
  PublicSection,
  SectionHeader,
} from "@/components/festival/public/PublicSection";
import { cn } from "@/core/utils/cn";
import type { TeamStanding } from "./ResultsList";

interface TeamStandingsSectionProps {
  standings: TeamStanding[];
  /** Renders the inner board only, without the section chrome. */
  bare?: boolean;
  /** Festival accent — drives the progress bar fill. */
  accentColor?: string;
  /** When set, shows a "View full" link in the board header. */
  viewAllHref?: string;
  /** Caps the rows shown (e.g. a landing-page teaser). */
  limit?: number;
}

export function TeamStandingsSection({
  standings,
  bare = false,
  accentColor,
  viewAllHref,
  limit,
}: TeamStandingsSectionProps) {
  const ranked = standings.map((team, index) => ({
    ...team,
    rank: team.rank || index + 1,
  }));

  const content =
    ranked.length === 0 ? (
      <EmptyState>No team standings published yet.</EmptyState>
    ) : (
      <StandingsBoard
        standings={ranked}
        accentColor={accentColor}
        viewAllHref={viewAllHref}
        limit={limit}
      />
    );

  if (bare) return content;

  return (
    <PublicSection bordered>
      <SectionHeader
        eyebrow="Standings"
        title="Team standings"
        className="mb-8"
      />
      {content}
    </PublicSection>
  );
}

/**
 * A ranked list, not a card. The leader's row is set larger than the rest so
 * the board has a shape you can read from across a hall.
 */
export function StandingsBoard({
  standings,
  accentColor,
  viewAllHref,
  limit,
}: {
  standings: (TeamStanding & { rank: number })[];
  accentColor?: string;
  viewAllHref?: string;
  limit?: number;
}) {
  const rows = limit ? standings.slice(0, limit) : standings;

  // Bars are proportional to the leader, so the top team always reads as full.
  const maxPoints = Math.max(...standings.map((t) => t.points), 0);
  const fill = accentColor || "var(--primary)";

  return (
    <div>
      <ol className="divide-y divide-border border-y border-border">
        {rows.map((team, i) => {
          const pct =
            maxPoints > 0 ? Math.max((team.points / maxPoints) * 100, 2) : 0;
          const isLeader = team.rank === 1;

          return (
            <motion.li
              key={team.name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="relative py-4"
            >
              <div className="flex items-baseline gap-4">
                <span
                  className={cn(
                    "w-6 shrink-0 tabular-nums",
                    isLeader
                      ? "text-base font-semibold"
                      : "text-sm text-muted-foreground",
                  )}
                  style={isLeader ? { color: fill } : undefined}
                >
                  {team.rank}
                </span>

                <span
                  className={cn(
                    "min-w-0 flex-1 truncate tracking-tight text-heading",
                    isLeader
                      ? "text-lg font-semibold sm:text-xl"
                      : "text-[15px] font-medium",
                  )}
                >
                  {team.name}
                </span>

                <span className="shrink-0 text-sm text-muted-foreground">
                  <span
                    className={cn(
                      "font-semibold tabular-nums text-foreground",
                      isLeader ? "text-lg sm:text-xl" : "text-[15px]",
                    )}
                  >
                    {team.points}
                  </span>
                  <span className="ml-1 text-xs">pts</span>
                </span>
              </div>

              {/* Hairline bar sits on the row's baseline rather than in a track */}
              <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: fill,
                    opacity: isLeader ? 1 : 0.45,
                  }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.7,
                    delay: i * 0.05,
                    ease: "easeOut",
                  }}
                />
              </div>
            </motion.li>
          );
        })}
      </ol>

      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="group mt-5 inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: fill }}
        >
          Full results
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
