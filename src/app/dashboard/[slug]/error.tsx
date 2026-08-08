"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { humanizeError } from "@/core/errors/humanize";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();

  const slug = pathname?.split("/")?.[2] ?? "";
  const dashboardHref = slug ? `/dashboard/${slug}` : "/";

  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  const friendly = humanizeError(error);

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] px-6 text-center relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-destructive/10 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card backdrop-blur-sm">
          <svg
            className="h-10 w-10 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        <span className="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-destructive">
          Something went wrong
        </span>

        <div className="space-y-2 max-w-sm">
          <h1 className="text-3xl font-bold tracking-tight text-heading">
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
            className="inline-flex items-center gap-2 justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary-hover"
          >
            Try again
          </button>
          <Link
            href={dashboardHref}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:bg-muted"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
