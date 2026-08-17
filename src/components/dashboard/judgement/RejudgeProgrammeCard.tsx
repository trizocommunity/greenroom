"use client";

import type { Programme } from "./types";

/**
 * Compact card for a programme that was judged and can be rejudged. Click
 * opens the start-judgement drawer in "rejudge" mode.
 */
export function RejudgeProgrammeCard({
  programme,
  onClick,
}: {
  programme: Programme;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="w-full rounded-xl border border-border/60 bg-linear-to-br from-background to-muted/30 px-3 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-4 cursor-pointer text-left"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-semibold sm:text-sm">
              {programme.name}
            </p>
            {programme.programmeCategory ? (
              <p className="text-[11px] text-muted-foreground">
                {programme.programmeCategory}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}
