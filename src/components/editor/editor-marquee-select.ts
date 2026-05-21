import { getElementBounds } from "./editor-element-actions";
import type { EditorElement } from "./poster-editor-types";

export interface MarqueeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function normalizeMarqueeBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): MarqueeBox {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  return {
    x,
    y,
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

function rectsOverlap(
  a: MarqueeBox,
  b: { x: number; y: number; width: number; height: number },
) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Element ids whose bounds intersect the marquee (partial overlap counts). */
export function idsInMarquee(
  elements: EditorElement[],
  box: MarqueeBox,
  minDrag = 4,
): string[] {
  if (box.width < minDrag && box.height < minDrag) return [];
  return elements
    .filter((el) => el.visible && !el.locked)
    .filter((el) => {
      const b = getElementBounds(el);
      return rectsOverlap(box, b);
    })
    .map((el) => el.id);
}
