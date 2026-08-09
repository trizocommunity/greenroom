"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileDown, Trophy } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ExpiredFestivalViewProps {
  festivalName: string;
  festivalSlug: string;
  hasPdf: boolean;
  downloadPdfUrl: string;
}

/**
 * Slim post-expiry landing: festival ended + entry points to results/standings
 * (and optional result-book PDF). News/media/login are hidden elsewhere.
 */
export function ExpiredFestivalView({
  festivalName,
  festivalSlug,
  hasPdf,
  downloadPdfUrl,
}: ExpiredFestivalViewProps) {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-grid mask-radial-fade absolute inset-0" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-aurora absolute left-1/2 top-1/2 h-[26rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[130px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative max-w-lg"
      >
        <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Festival closed
        </p>

        <h1 className="text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-heading sm:text-5xl">
          {festivalName}
        </h1>

        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          This festival has ended. Results and standings remain available
          below.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            className="h-12 rounded-full px-7 text-base font-medium"
            asChild
          >
            <Link href={`/${festivalSlug}/results`}>
              <Trophy className="mr-2 h-4 w-4" />
              View results &amp; standings
            </Link>
          </Button>

          {hasPdf && (
            <Button
              variant="outline"
              className="h-12 rounded-full px-7 text-base font-medium"
              asChild
            >
              <Link
                href={downloadPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Download result book
              </Link>
            </Button>
          )}
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Run your own festival on Greenroom
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
