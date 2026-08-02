"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The single "there is more" control shared by results, news and media, so
 * all three read the same way and report progress the same way.
 */
export function LoadMore({
  shown,
  total,
  hasMore,
  isLoading,
  error,
  onLoadMore,
  noun,
  accentColor = "var(--primary)",
}: {
  shown: number;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  onLoadMore: () => void;
  /** Plural noun for the counter, e.g. "programmes". */
  noun: string;
  accentColor?: string;
}) {
  if (total === 0) return null;

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <p className="text-xs tabular-nums text-muted-foreground">
        Showing {shown.toLocaleString()} of {total.toLocaleString()} {noun}
      </p>

      {hasMore && (
        <Button
          type="button"
          variant="outline"
          onClick={onLoadMore}
          disabled={isLoading}
          className="h-10 rounded-full px-6 text-sm font-medium"
          style={{ color: accentColor }}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Loading
            </>
          ) : (
            "Load more"
          )}
        </Button>
      )}

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
