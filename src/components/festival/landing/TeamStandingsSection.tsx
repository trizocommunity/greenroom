"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  EmptyState,
  PublicSection,
  SectionHeader,
} from "@/components/festival/public/PublicSection";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/core/utils/cn";
import { useLiveChannel } from "@/hooks/use-live-channel";
import type { TeamStanding } from "./ResultsList";

interface TeamStandingsSectionProps {
  standings: TeamStanding[];
  /** Festival ID — only required when the page wants live SSE updates.
   *  When omitted (e.g. the `bare` view on `/results`) the section skips
   *  the channel subscription entirely. */
  festivalId?: string;
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
  festivalId,
  bare = false,
  accentColor,
  viewAllHref,
  limit,
}: TeamStandingsSectionProps) {
  const router = useRouter();

  /* UC7 — `announceResult` publishes `{ teamStandings, lastUpdatedAt }` to
     the standings channel. We don't re-render the board from the payload
     directly — `router.refresh()` re-runs the parent server loader so the
     standings object is re-read from the DB, which keeps the board
     consistent with the rest of the page. */
  const { data: standingsEvent } = useLiveChannel<{
    festivalId: string;
    teamStandings: TeamStanding[] | null;
    lastUpdatedAt: string;
  }>(
    festivalId
      ? {
          url: `/api/v1/festivals/${festivalId}/standings/stream`,
        }
      : { url: "" },
  );

  useEffect(() => {
    if (!standingsEvent) return;
    router.refresh();
  }, [standingsEvent, router]);

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
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = limit || 15;

  const totalPages = Math.ceil(standings.length / pageSize);
  const rows = standings.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize,
  );

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

      {!limit && totalPages > 1 && (
        <div className="mt-6 flex justify-center pb-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={(e) => {
                    e.preventDefault();
                    setPageIndex((p) => Math.max(0, p - 1));
                  }}
                  className={
                    pageIndex === 0 ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>

              {[...Array(totalPages)].map((_, i) => {
                // Show first, last, current, and adjacent pages
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

                // Show ellipsis if there's a gap
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
