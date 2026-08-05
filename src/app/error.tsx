"use client";

import Link from "next/link";
import { useEffect } from "react";
import { humanizeError } from "@/core/errors/humanize";

export default function GlobalSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SegmentError]", error);
  }, [error]);

  const friendly = humanizeError(error);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-center text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-destructive/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5 max-w-sm">
        <span className="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-destructive">
          Something went wrong
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-heading">
            Unexpected error
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {friendly.message}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary-hover"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-muted"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
