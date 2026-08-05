"use client";

import { AlertCircle, X } from "lucide-react";
import { errorStore } from "@/core/errors/error-store";
import { useErrorDispatcher, useGlobalErrors } from "@/core/errors/use-error-store";
import { cn } from "@/core/utils/cn";

export function GlobalErrorRegion({ className }: { className?: string }) {
  const entries = useGlobalErrors();
  const dispatcher = useErrorDispatcher();

  if (entries.length === 0) return null;

  return (
    <section
      aria-label="Notifications"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-4 sm:right-4 sm:top-auto sm:items-end",
        className,
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-sm flex-col gap-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            role="alert"
            aria-live="polite"
            className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive shadow-lg backdrop-blur-sm"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              {entry.title ? (
                <p className="font-semibold leading-tight">{entry.title}</p>
              ) : null}
              <p className="leading-snug">{entry.message}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                dispatcher.dismiss(entry.id);
                errorStore.dismiss(entry.id);
              }}
              className="shrink-0 rounded p-0.5 text-destructive/80 transition-opacity hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-destructive/40"
              aria-label="Dismiss error"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}