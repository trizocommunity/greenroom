"use client";

import { Sparkles } from "lucide-react";
import { ScratchGrid } from "./ScratchGrid";
import type { ScratchTile } from "./types";
import type { ReportingActiveAction } from "./useReportingActions";

/**
 * The draw-code-letters phase. Header copy + the ScratchGrid itself. Lives
 * in its own file so the workspace can swap this in once `wizardStep` flips
 * to "scratch".
 */
export function ReportingScratchStep({
  scratchTiles,
  currentQueuePosition,
  isRevealing,
  activeAction,
  onScratch,
  onRevealAll,
}: {
  scratchTiles: ScratchTile[];
  currentQueuePosition: number | null;
  isRevealing: boolean;
  activeAction: ReportingActiveAction;
  onScratch: (codeLetterId: string) => void;
  onRevealAll: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="inline-flex items-center gap-1.5 font-semibold text-sm tracking-tight">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          Step 2 · Draw code letters
        </h3>
        <p className="text-muted-foreground text-xs">
          Checkout is closed. Each participant scratches one tile in turn to
          reveal their code letter.
        </p>
      </div>
      <ScratchGrid
        tiles={scratchTiles}
        currentQueuePosition={currentQueuePosition}
        isRevealing={isRevealing}
        onScratch={onScratch}
        onRevealAll={onRevealAll}
        isRevealingAll={activeAction === "reveal-all"}
      />
    </div>
  );
}
