"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils/cn";

export type CompactHistoryItem = {
  id: string;
  title: string;
  metaPrimary?: string | null;
  metaSecondary?: string | null;
  badge?: string | null;
  tinyBadge?: string | null;
  metaSecondaryTitle?: string;
  detailSummary?: string | null;
};

export function CompactHistoryList({
  emptyText = "No history found",
  items,
  className,
  onViewItem,
}: {
  emptyText?: string;
  items: CompactHistoryItem[];
  className?: string;
  onViewItem?: (id: string) => void;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-medium">
                    {item.title}
                  </span>
                  {item.badge ? (
                    <span className="shrink-0 rounded border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {item.badge}
                    </span>
                  ) : null}
                  {item.tinyBadge ? (
                    <span className="shrink-0 rounded border border-purple/60 px-1.5 py-0.5 text-[10px] font-medium text-purple">
                      {item.tinyBadge}
                    </span>
                  ) : null}
                  <span className="truncate text-[11px] text-muted-foreground">
                    {[item.metaPrimary, item.metaSecondary]
                      .filter(Boolean)
                      .join(" • ")}
                  </span>
                </div>
                {item.detailSummary ? (
                  <p
                    className="truncate text-[11px] text-muted-foreground/90"
                    title={item.metaSecondaryTitle}
                  >
                    {item.detailSummary}
                  </p>
                ) : null}
              </div>
              {onViewItem ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-[11px]"
                  onClick={() => onViewItem(item.id)}
                >
                  View
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
