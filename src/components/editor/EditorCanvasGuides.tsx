"use client";

import type { CSSProperties } from "react";
import type { SnapGuideResult } from "./editor-snap-guides";
import { isValidElementRect } from "./editor-snap-guides";
import { EDITOR_COLORS } from "./editor-theme";

const GUIDE_COLOR = EDITOR_COLORS.selectionBlue;

const labelClass =
  "absolute rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white";

function GuideLabel({ value, style }: { value: number; style: CSSProperties }) {
  if (!Number.isFinite(value)) return null;
  return (
    <span
      className={labelClass}
      style={{ ...style, backgroundColor: GUIDE_COLOR }}
    >
      {Math.round(value)}
    </span>
  );
}

function dashedLineStyle(
  orientation: "horizontal" | "vertical",
): CSSProperties {
  return orientation === "vertical"
    ? {
        borderLeft: `1px dashed ${GUIDE_COLOR}`,
        width: 0,
      }
    : {
        borderTop: `1px dashed ${GUIDE_COLOR}`,
        height: 0,
      };
}

export function EditorCanvasGuides({
  guides,
  zoom,
  showSnapLines,
  showDistances,
}: {
  guides: SnapGuideResult | null;
  zoom: number;
  showSnapLines: boolean;
  showDistances: boolean;
}) {
  if (!guides || (!showSnapLines && !showDistances)) return null;
  if (!isValidElementRect(guides.rect)) return null;

  const { snapLines, peerGaps } = guides;
  const s = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-visible"
      aria-hidden
    >
      {showSnapLines &&
        snapLines.map((line, i) =>
          line.orientation === "vertical" ? (
            <div
              key={`v-${line.position}-${i}`}
              className="absolute top-0"
              style={{
                left: line.position * s,
                height: "100%",
                ...dashedLineStyle("vertical"),
              }}
            />
          ) : (
            <div
              key={`h-${line.position}-${i}`}
              className="absolute left-0"
              style={{
                top: line.position * s,
                width: "100%",
                ...dashedLineStyle("horizontal"),
              }}
            />
          ),
        )}

      {showDistances &&
        peerGaps.map((gap, i) => {
          const x1 = gap.x1 * s;
          const y1 = gap.y1 * s;
          const x2 = gap.x2 * s;
          const y2 = gap.y2 * s;
          const midX = gap.midX * s;
          const midY = gap.midY * s;
          const isHorizontal = gap.axis === "x";

          return (
            <div key={`gap-${gap.axis}-${i}`}>
              <div
                className="absolute"
                style={
                  isHorizontal
                    ? {
                        left: Math.min(x1, x2),
                        top: y1,
                        width: Math.abs(x2 - x1),
                        ...dashedLineStyle("horizontal"),
                      }
                    : {
                        left: x1,
                        top: Math.min(y1, y2),
                        height: Math.abs(y2 - y1),
                        ...dashedLineStyle("vertical"),
                      }
                }
              />
              <GuideLabel
                value={gap.gap}
                style={{
                  left: midX - 14,
                  top: midY - 8,
                }}
              />
            </div>
          );
        })}
    </div>
  );
}
