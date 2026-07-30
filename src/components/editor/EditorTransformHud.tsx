"use client";

import type { SnapGuideResult } from "./editor-snap-guides";
import { isValidElementRect } from "./editor-snap-guides";

export function EditorTransformHud({
  guides,
  zoom,
  rotation,
  visible,
}: {
  guides: SnapGuideResult | null;
  zoom: number;
  rotation?: number;
  visible: boolean;
}) {
  if (!visible || !guides || !isValidElementRect(guides.rect)) return null;

  const { rect } = guides;
  const z = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const boxW = rect.width * z;
  const left = rect.left * z + boxW / 2;
  const top = rect.bottom * z + 4;

  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;

  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded bg-foreground/90 px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums text-background shadow-sm"
      style={{ left, top }}
    >
      <span>X {Math.round(rect.left)}</span>
      <span className="mx-1 text-background/50">·</span>
      <span>Y {Math.round(rect.top)}</span>
      <span className="mx-1 text-background/50">·</span>
      <span>
        {Math.round(rect.width)} × {Math.round(rect.height)}
      </span>
      {rotation !== undefined &&
        Number.isFinite(rotation) &&
        Math.abs(rotation) > 0.5 && (
          <>
            <span className="mx-1 text-background/50">·</span>
            <span>{Math.round(rotation)}°</span>
          </>
        )}
    </div>
  );
}
