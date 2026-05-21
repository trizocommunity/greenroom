import { getElementBounds } from "./editor-element-actions";
import type { EditorElement } from "./poster-editor-types";

export const SNAP_THRESHOLD = 8;

export interface ElementRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface SnapLine {
  orientation: "horizontal" | "vertical";
  /** Canvas coordinate (px) */
  position: number;
}

export interface CanvasDistances {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/** Gap to the nearest peer or canvas edge along one axis */
export interface PeerGap {
  axis: "x" | "y";
  gap: number;
  midX: number;
  midY: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SnapGuideResult {
  rect: ElementRect;
  distances: CanvasDistances;
  snapLines: SnapLine[];
  peerGaps: PeerGap[];
  snapX?: number;
  snapY?: number;
}

const ALIGN_EPSILON = 0.5;

type SnapAxis = "x" | "y";

interface SnapCandidate {
  axis: SnapAxis;
  line: number;
  pos: number;
  delta: number;
}

export function elementToRect(el: EditorElement): ElementRect {
  const { x, y, width, height } = getElementBounds(el);
  return rectFromBox(x, y, width, height);
}

export function rectFromBox(
  x: number,
  y: number,
  width: number,
  height: number,
): ElementRect {
  return {
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
    centerX: x + width / 2,
    centerY: y + height / 2,
  };
}

export function isValidElementRect(rect: ElementRect | null | undefined): rect is ElementRect {
  if (!rect) return false;
  return (
    Number.isFinite(rect.left) &&
    Number.isFinite(rect.top) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width >= 0 &&
    rect.height >= 0
  );
}

export function unionRects(rects: ElementRect[]): ElementRect | null {
  const valid = rects.filter(isValidElementRect);
  if (valid.length === 0) return null;
  const left = Math.min(...valid.map((r) => r.left));
  const top = Math.min(...valid.map((r) => r.top));
  const right = Math.max(...valid.map((r) => r.right));
  const bottom = Math.max(...valid.map((r) => r.bottom));
  const width = right - left;
  const height = bottom - top;
  return {
    left,
    top,
    right,
    bottom,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

export function rectAtPosition(
  base: ElementRect,
  x: number,
  y: number,
): ElementRect {
  return rectFromBox(x, y, base.width, base.height);
}

function pushX(
  out: SnapCandidate[],
  edge: number,
  line: number,
  snapX: number,
) {
  out.push({
    axis: "x",
    line,
    pos: snapX,
    delta: Math.abs(edge - line),
  });
}

function pushY(
  out: SnapCandidate[],
  edge: number,
  line: number,
  snapY: number,
) {
  out.push({
    axis: "y",
    line,
    pos: snapY,
    delta: Math.abs(edge - line),
  });
}

function collectSnapCandidates(
  canvasW: number,
  canvasH: number,
  rect: ElementRect,
  peers: EditorElement[],
  excludeIds: string[],
): SnapCandidate[] {
  const out: SnapCandidate[] = [];

  pushX(out, rect.left, 0, 0);
  pushX(out, rect.centerX, canvasW / 2, canvasW / 2 - rect.width / 2);
  pushX(out, rect.right, canvasW, canvasW - rect.width);

  pushY(out, rect.top, 0, 0);
  pushY(out, rect.centerY, canvasH / 2, canvasH / 2 - rect.height / 2);
  pushY(out, rect.bottom, canvasH, canvasH - rect.height);

  for (const peer of peers) {
    if (excludeIds.includes(peer.id)) continue;
    const p = elementToRect(peer);

    pushX(out, rect.left, p.left, p.left);
    pushX(out, rect.left, p.centerX, p.centerX);
    pushX(out, rect.left, p.right, p.right);

    pushX(out, rect.centerX, p.centerX, p.centerX - rect.width / 2);
    pushX(out, rect.centerX, p.left, p.left - rect.width / 2);
    pushX(out, rect.centerX, p.right, p.right - rect.width / 2);

    pushX(out, rect.right, p.right, p.right - rect.width);
    pushX(out, rect.right, p.centerX, p.centerX - rect.width);
    pushX(out, rect.right, p.left, p.left - rect.width);

    pushY(out, rect.top, p.top, p.top);
    pushY(out, rect.top, p.centerY, p.centerY);
    pushY(out, rect.top, p.bottom, p.bottom);

    pushY(out, rect.centerY, p.centerY, p.centerY - rect.height / 2);
    pushY(out, rect.centerY, p.top, p.top - rect.height / 2);
    pushY(out, rect.centerY, p.bottom, p.bottom - rect.height / 2);

    pushY(out, rect.bottom, p.bottom, p.bottom - rect.height);
    pushY(out, rect.bottom, p.centerY, p.centerY - rect.height);
    pushY(out, rect.bottom, p.top, p.top - rect.height);
  }

  return out;
}

function pickBest(
  candidates: SnapCandidate[],
  axis: SnapAxis,
  threshold: number,
): SnapCandidate | undefined {
  const matches = candidates.filter(
    (c) => c.axis === axis && c.delta <= threshold,
  );
  if (matches.length === 0) return undefined;
  return matches.reduce((best, c) => (c.delta < best.delta ? c : best));
}

function rangesOverlap(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): boolean {
  return a0 < b1 && a1 > b0;
}

function aligned(a: number, b: number): boolean {
  return Math.abs(a - b) <= ALIGN_EPSILON;
}

/** Lines for edges/centers that already match canvas or peers (Figma-style display). */
export function collectActiveAlignmentLines(
  canvasW: number,
  canvasH: number,
  rect: ElementRect,
  peers: EditorElement[],
  excludeIds: string[],
): SnapLine[] {
  const lines: SnapLine[] = [];
  const seen = new Set<string>();
  const add = (orientation: SnapLine["orientation"], position: number) => {
    const key = `${orientation}-${position}`;
    if (seen.has(key)) return;
    seen.add(key);
    lines.push({ orientation, position });
  };

  if (aligned(rect.left, 0)) add("vertical", 0);
  if (aligned(rect.centerX, canvasW / 2)) add("vertical", canvasW / 2);
  if (aligned(rect.right, canvasW)) add("vertical", canvasW);

  if (aligned(rect.top, 0)) add("horizontal", 0);
  if (aligned(rect.centerY, canvasH / 2)) add("horizontal", canvasH / 2);
  if (aligned(rect.bottom, canvasH)) add("horizontal", canvasH);

  for (const peer of peers) {
    if (excludeIds.includes(peer.id)) continue;
    const p = elementToRect(peer);

    if (aligned(rect.left, p.left)) add("vertical", p.left);
    if (aligned(rect.left, p.centerX)) add("vertical", p.centerX);
    if (aligned(rect.left, p.right)) add("vertical", p.right);

    if (aligned(rect.centerX, p.centerX)) add("vertical", p.centerX);
    if (aligned(rect.centerX, p.left)) add("vertical", p.left);
    if (aligned(rect.centerX, p.right)) add("vertical", p.right);

    if (aligned(rect.right, p.right)) add("vertical", p.right);
    if (aligned(rect.right, p.centerX)) add("vertical", p.centerX);
    if (aligned(rect.right, p.left)) add("vertical", p.left);

    if (aligned(rect.top, p.top)) add("horizontal", p.top);
    if (aligned(rect.top, p.centerY)) add("horizontal", p.centerY);
    if (aligned(rect.top, p.bottom)) add("horizontal", p.bottom);

    if (aligned(rect.centerY, p.centerY)) add("horizontal", p.centerY);
    if (aligned(rect.centerY, p.top)) add("horizontal", p.top);
    if (aligned(rect.centerY, p.bottom)) add("horizontal", p.bottom);

    if (aligned(rect.bottom, p.bottom)) add("horizontal", p.bottom);
    if (aligned(rect.bottom, p.centerY)) add("horizontal", p.centerY);
    if (aligned(rect.bottom, p.top)) add("horizontal", p.top);
  }

  return lines;
}

function mergeSnapLines(primary: SnapLine[], secondary: SnapLine[]): SnapLine[] {
  const seen = new Set<string>();
  const out: SnapLine[] = [];
  for (const line of [...primary, ...secondary]) {
    const key = `${line.orientation}-${line.position}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function overlapMid(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): number {
  const top = Math.max(a0, b0);
  const bottom = Math.min(a1, b1);
  return (top + bottom) / 2;
}

/** Nearest neighbor gaps for distance labels (canvas + peers). */
export function computePeerGaps(
  canvasW: number,
  canvasH: number,
  rect: ElementRect,
  peers: EditorElement[],
  excludeIds: string[],
): PeerGap[] {
  const gaps: PeerGap[] = [];

  type SideGap = { gap: number; edge: number; crossMid: number };

  let nearestLeft: SideGap = {
    gap: rect.left,
    edge: 0,
    crossMid: rect.centerY,
  };
  let nearestRight: SideGap = {
    gap: canvasW - rect.right,
    edge: canvasW,
    crossMid: rect.centerY,
  };
  let nearestTop: SideGap = {
    gap: rect.top,
    edge: 0,
    crossMid: rect.centerX,
  };
  let nearestBottom: SideGap = {
    gap: canvasH - rect.bottom,
    edge: canvasH,
    crossMid: rect.centerX,
  };

  for (const peer of peers) {
    if (excludeIds.includes(peer.id)) continue;
    const p = elementToRect(peer);

    if (rangesOverlap(rect.top, rect.bottom, p.top, p.bottom)) {
      if (p.right <= rect.left) {
        const gap = rect.left - p.right;
        if (gap < nearestLeft.gap) {
          nearestLeft = {
            gap,
            edge: p.right,
            crossMid: overlapMid(rect.top, rect.bottom, p.top, p.bottom),
          };
        }
      }
      if (p.left >= rect.right) {
        const gap = p.left - rect.right;
        if (gap < nearestRight.gap) {
          nearestRight = {
            gap,
            edge: p.left,
            crossMid: overlapMid(rect.top, rect.bottom, p.top, p.bottom),
          };
        }
      }
    }

    if (rangesOverlap(rect.left, rect.right, p.left, p.right)) {
      if (p.bottom <= rect.top) {
        const gap = rect.top - p.bottom;
        if (gap < nearestTop.gap) {
          nearestTop = {
            gap,
            edge: p.bottom,
            crossMid: overlapMid(rect.left, rect.right, p.left, p.right),
          };
        }
      }
      if (p.top >= rect.bottom) {
        const gap = p.top - rect.bottom;
        if (gap < nearestBottom.gap) {
          nearestBottom = {
            gap,
            edge: p.top,
            crossMid: overlapMid(rect.left, rect.right, p.left, p.right),
          };
        }
      }
    }
  }

  if (nearestLeft.gap > ALIGN_EPSILON) {
    gaps.push({
      axis: "x",
      gap: nearestLeft.gap,
      midX: nearestLeft.edge + nearestLeft.gap / 2,
      midY: nearestLeft.crossMid,
      x1: nearestLeft.edge,
      y1: nearestLeft.crossMid,
      x2: rect.left,
      y2: nearestLeft.crossMid,
    });
  }

  if (nearestRight.gap > ALIGN_EPSILON) {
    gaps.push({
      axis: "x",
      gap: nearestRight.gap,
      midX: rect.right + nearestRight.gap / 2,
      midY: nearestRight.crossMid,
      x1: rect.right,
      y1: nearestRight.crossMid,
      x2: nearestRight.edge,
      y2: nearestRight.crossMid,
    });
  }

  if (nearestTop.gap > ALIGN_EPSILON) {
    gaps.push({
      axis: "y",
      gap: nearestTop.gap,
      midX: nearestTop.crossMid,
      midY: nearestTop.edge + nearestTop.gap / 2,
      x1: nearestTop.crossMid,
      y1: nearestTop.edge,
      x2: nearestTop.crossMid,
      y2: rect.top,
    });
  }

  if (nearestBottom.gap > ALIGN_EPSILON) {
    gaps.push({
      axis: "y",
      gap: nearestBottom.gap,
      midX: nearestBottom.crossMid,
      midY: rect.bottom + nearestBottom.gap / 2,
      x1: nearestBottom.crossMid,
      y1: rect.bottom,
      x2: nearestBottom.crossMid,
      y2: nearestBottom.edge,
    });
  }

  return gaps;
}

function linesFromCandidates(
  candidates: SnapCandidate[],
  threshold: number,
  xBest?: SnapCandidate,
  yBest?: SnapCandidate,
): SnapLine[] {
  const lines: SnapLine[] = [];
  const seen = new Set<string>();

  for (const c of candidates) {
    if (c.delta > threshold) continue;
    if (c.axis === "x" && xBest && c.delta > xBest.delta + 0.5) continue;
    if (c.axis === "y" && yBest && c.delta > yBest.delta + 0.5) continue;
    const key = `${c.axis}-${c.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push({
      orientation: c.axis === "x" ? "vertical" : "horizontal",
      position: c.line,
    });
  }

  return lines;
}

/**
 * Smart guides: snap edges/centers to canvas and peer elements.
 * Distances are canvas-edge gaps from the selection bounding box center.
 */
export function computeSnapGuides(
  canvasW: number,
  canvasH: number,
  rect: ElementRect,
  peers: EditorElement[],
  excludeIds: string[],
  options?: { enabled?: boolean; threshold?: number },
): SnapGuideResult {
  const enabled = options?.enabled ?? true;
  const threshold = options?.threshold ?? SNAP_THRESHOLD;

  const emptyDistances: CanvasDistances = {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  };

  if (!isValidElementRect(rect)) {
    return {
      rect: rectFromBox(0, 0, 0, 0),
      distances: emptyDistances,
      snapLines: [],
      peerGaps: [],
    };
  }

  const distances: CanvasDistances = {
    top: Math.max(0, rect.top),
    left: Math.max(0, rect.left),
    right: Math.max(0, canvasW - rect.right),
    bottom: Math.max(0, canvasH - rect.bottom),
  };

  const peerGaps = computePeerGaps(
    canvasW,
    canvasH,
    rect,
    peers,
    excludeIds,
  );

  if (!enabled) {
    return {
      rect,
      distances,
      snapLines: collectActiveAlignmentLines(
        canvasW,
        canvasH,
        rect,
        peers,
        excludeIds,
      ),
      peerGaps,
    };
  }

  const candidates = collectSnapCandidates(
    canvasW,
    canvasH,
    rect,
    peers,
    excludeIds,
  );
  const xBest = pickBest(candidates, "x", threshold);
  const yBest = pickBest(candidates, "y", threshold);

  let snapX: number | undefined;
  let snapY: number | undefined;
  let finalRect = rect;

  if (xBest) {
    snapX = xBest.pos;
    finalRect = rectAtPosition(finalRect, snapX, finalRect.top);
  }
  if (yBest) {
    snapY = yBest.pos;
    finalRect = rectAtPosition(finalRect, finalRect.left, snapY);
  }

  const snapLines = mergeSnapLines(
    linesFromCandidates(candidates, threshold, xBest, yBest),
    collectActiveAlignmentLines(
      canvasW,
      canvasH,
      finalRect,
      peers,
      excludeIds,
    ),
  );

  return {
    rect: finalRect,
    distances: {
      top: Math.max(0, finalRect.top),
      left: Math.max(0, finalRect.left),
      right: Math.max(0, canvasW - finalRect.right),
      bottom: Math.max(0, canvasH - finalRect.bottom),
    },
    snapLines,
    peerGaps: computePeerGaps(
      canvasW,
      canvasH,
      finalRect,
      peers,
      excludeIds,
    ),
    snapX,
    snapY,
  };
}
