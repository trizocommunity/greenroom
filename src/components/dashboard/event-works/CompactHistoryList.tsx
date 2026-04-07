"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type CompactHistoryItem = {
  id: string;
  title: string;
  metaPrimary?: string | null;
  metaSecondary?: string | null;
  badge?: string | null;
  metaSecondaryTitle?: string;
};

export function CompactHistoryList({
  title,
  count,
  emptyText,
  items,
  maxHeightClass = "max-h-[42vh]",
  className,
}: {
  title: string;
  count: number;
  emptyText: string;
  items: CompactHistoryItem[];
  maxHeightClass?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Badge variant="secondary">{count}</Badge>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <div className={cn("space-y-2 overflow-y-auto pr-1", maxHeightClass)}>
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium truncate">{item.title}</span>
                  {item.badge ? (
                    <span className="rounded border bg-muted/30 px-1.5 py-0.5 text-[11px] text-muted-foreground shrink-0">
                      {item.badge}
                    </span>
                  ) : null}
                  {item.metaPrimary ? (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground shrink-0">
                        {item.metaPrimary}
                      </span>
                    </>
                  ) : null}
                  {item.metaSecondary ? (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span
                        className="text-muted-foreground truncate"
                        title={item.metaSecondaryTitle}
                      >
                        {item.metaSecondary}
                      </span>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
