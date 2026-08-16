"use client";

import { Badge } from "@/components/ui/badge";
import type { JudgedProgrammeCard } from "./types";
import { judgementStatusLabel } from "./types";

/**
 * One row in the "Completed judgements" list. Click to open the detail
 * drawer; the parent owns the click handler so the row stays presentational.
 */
export function CompletedJudgementItem({
  item,
  formatCardDateTime,
  onClick,
}: {
  item: JudgedProgrammeCard;
  formatCardDateTime: (v: string | Date) => string;
  onClick: () => void;
}) {
  const isPublished = (item.programmeStatus ?? "")
    .toUpperCase()
    .includes("PUBLISHED");

  return (
    <button
      type="button"
      className="flex w-full items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-card cursor-pointer text-left"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm line-clamp-1">
            {item.programmeName}
          </h4>
          {isPublished && (
            <Badge
              variant="outline"
              className="border-purple/60 text-purple bg-purple/10 text-[10px] hidden sm:inline-flex"
            >
              Published
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <Badge variant="default" className="text-[10px]">
            {judgementStatusLabel(item.judgementStatus)}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {item.judgingMode}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {item.totalJudgements} entries
          </span>
          {item.programmeCategory && (
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              · {item.programmeCategory}
            </span>
          )}
          <span className="text-xs text-muted-foreground hidden md:inline-block">
            · Created {formatCardDateTime(item.createdAt)}
          </span>
        </div>
      </div>
    </button>
  );
}
