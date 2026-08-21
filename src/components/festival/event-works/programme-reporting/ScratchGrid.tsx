"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Crown, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils/cn";
import type { ScratchTile } from "./types";

type ScratchGridProps = {
  tiles: ScratchTile[];
  /** The unit whose turn it is — everything else is inert. */
  currentQueuePosition: number | null;
  isRevealing: boolean;
  onScratch: (codeLetterId: string) => void;
  onRevealAll: () => void;
  isRevealingAll: boolean;
};

/**
 * The lot-drawing surface. Tiles are laid out in a fixed grid, face down; the
 * participant whose turn it is picks any one and scratches it.
 *
 * The grid is deliberately keyed by tile identity and never re-sorted after a
 * reveal — a tile that moved when someone scratched it would tell the next
 * person something about what is underneath the others.
 */
export function ScratchGrid({
  tiles,
  currentQueuePosition,
  isRevealing,
  onScratch,
  onRevealAll,
  isRevealingAll,
}: ScratchGridProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);


  const current = tiles.find((t) => t.queuePosition === currentQueuePosition);
  const remaining = tiles.filter((t) => !t.revealedAt).length;
  const isDone = remaining === 0;

  const handleScratch = (tile: ScratchTile) => {
    if (tile.revealedAt || isRevealing || !current) return;
    setPendingId(tile.codeLetterId);
    onScratch(tile.codeLetterId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="min-w-0">
          {isDone ? (
            <p className="font-medium text-sm">
              All {tiles.length} code letter{tiles.length === 1 ? "" : "s"}{" "}
              drawn.
            </p>
          ) : current ? (
            <>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                Now scratching
              </p>
              <p className="truncate font-medium text-sm">
                {current.label}{" "}
                <span className="text-muted-foreground">
                  (#{current.queuePosition} of {tiles.length})
                </span>
              </p>
              {current.teamLeadName ? (
                <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  <Crown className="h-3 w-3 shrink-0 text-primary" />
                  {current.teamLeadName}
                </p>
              ) : current.subLabel ? (
                <p className="truncate text-muted-foreground text-xs">
                  {current.subLabel}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Waiting for the next participant…
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs">
            {tiles.length - remaining}/{tiles.length} drawn
          </span>
          {remaining > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRevealAll}
              disabled={isRevealingAll || isRevealing}
            >
              {isRevealingAll ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Reveal remaining ({remaining})
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {tiles.map((tile) => {
          const revealed = Boolean(tile.revealedAt);
          const isPending = pendingId === tile.codeLetterId && isRevealing;
          const canScratch = !revealed && Boolean(current) && !isRevealing;

          return (
            <button
              key={tile.codeLetterId}
              type="button"
              onClick={() => handleScratch(tile)}
              disabled={!canScratch}
              aria-label={
                revealed
                  ? `Code ${tile.code} — already drawn`
                  : "Unscratched code letter"
              }
              className={cn(
                "relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border-2 transition",
                revealed
                  ? "border-primary/30 bg-primary/5"
                  : canScratch
                    ? "cursor-pointer border-dashed border-muted-foreground/40 bg-gradient-to-br from-muted to-muted/60 hover:border-primary hover:shadow-md"
                    : "cursor-not-allowed border-dashed border-muted-foreground/20 bg-muted/40 opacity-60",
              )}
            >
              <AnimatePresence mode="wait">
                {isPending ? (
                  <motion.span key="pending">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </motion.span>
                ) : revealed ? (
                  <motion.span
                    key="revealed"
                    initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 18 }}
                    className="font-bold text-2xl text-primary"
                  >
                    {tile.code}
                  </motion.span>
                ) : (
                  <motion.span key="hidden" exit={{ opacity: 0, scale: 1.4 }}>
                    <Sparkles className="h-5 w-5 text-muted-foreground/50" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      {!isDone && !current ? (
        <p className="text-center text-muted-foreground text-xs">
          Every remaining participant has drawn. Use “Reveal remaining” to close
          out the rest.
        </p>
      ) : null}

    </div>
  );
}
