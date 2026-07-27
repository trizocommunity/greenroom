"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div className="flex flex-col items-center gap-5 max-w-sm">
            <span className="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-destructive">
              Something went wrong
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Unexpected error
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {error.message ||
                  "An unexpected error occurred. Please try again."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-hover"
              >
                Try again
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-muted"
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
