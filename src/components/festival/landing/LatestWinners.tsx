"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  PublicSection,
  SectionHeader,
} from "@/components/festival/public/PublicSection";

import { useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export interface LatestResult {
  id: string;
  programName: string;
  winner: string;
  team: string;
  chestNo?: string | null;
  resultNumber?: number | string | null;
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
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 3;
  const totalPages = Math.ceil(results.length / pageSize);

  if (results.length === 0) return null;

  return (
    <PublicSection bordered>
      <SectionHeader eyebrow="Results" title="Latest wins" className="mb-8" />

      <ol className="divide-y divide-border border-y border-border">
        {results.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize).map((result, i) => (
          <motion.li
            key={result.id}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              {result.resultNumber ? (
                <div className="flex w-5 shrink-0 justify-center">
                  <div
                    className="text-[13px] font-bold text-muted-foreground/50 tracking-widest"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                    }}
                  >
                    #{result.resultNumber}
                  </div>
                </div>
              ) : (
                <div className="w-5 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-tight text-heading">
                  {result.winner}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {result.team}
                </p>
              </div>
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
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center pb-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPageIndex((p) => Math.max(0, p - 1));
                  }}
                  className={pageIndex === 0 ? "pointer-events-none opacity-50" : ""}
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
                        href="#"
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
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPageIndex((p) => Math.min(totalPages - 1, p + 1));
                  }}
                  className={pageIndex === totalPages - 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

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
