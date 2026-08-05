"use client";

import { AlertCircle, X } from "lucide-react";
import { errorStore } from "@/core/errors/error-store";
import { useErrorDispatcher, useErrors } from "@/core/errors/use-error-store";
import { cn } from "@/core/utils/cn";
import { useErrorScopeContext } from "./ErrorScopeProvider";

export interface InlineErrorProps {
  scope?: string;
  className?: string;
  fallbackScope?: string;
  onDismiss?: (id: string) => void;
}

export function InlineError({
  scope,
  className,
  fallbackScope,
  onDismiss,
}: InlineErrorProps) {
  const contextScope = useErrorScopeContext();
  const resolvedScope = scope ?? contextScope ?? fallbackScope;
  const entries = useErrors(resolvedScope);
  const dispatcher = useErrorDispatcher(resolvedScope);

  if (entries.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={cn("space-y-2", className)}
    >
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive",
          )}
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
          {entry.dismissible !== false ? (
            <button
              type="button"
              onClick={() => {
                if (onDismiss) onDismiss(entry.id);
                else {
                  dispatcher.dismiss(entry.id);
                  errorStore.dismiss(entry.id);
                }
              }}
              className="shrink-0 rounded p-0.5 text-destructive/80 transition-opacity hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-destructive/40"
              aria-label="Dismiss error"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}