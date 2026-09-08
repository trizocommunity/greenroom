import type { PosterEditorDocument } from "@/components/editor/poster-editor-types";
import type { PosterBindings } from "@/features/posters/services/poster-bindings.service";

/** Multi-per-page grid preset. See `parseMultiGrid` and `autoMultiGrid`. */
export type MultiGrid =
  | "AUTO"
  | "1x2"
  | "1x3"
  | "1x4"
  | "1x5"
  | "1x6"
  | "2x1"
  | "2x2"
  | "2x3"
  | "2x4"
  | "2x5"
  | "2x6"
  | "3x1"
  | "3x2"
  | "3x3"
  | "3x4"
  | "3x5"
  | "3x6"
  | "4x1"
  | "4x2"
  | "4x3"
  | "4x4"
  | "4x5"
  | "4x6"
  | "5x1"
  | "5x2"
  | "5x3"
  | "5x4"
  | "6x1"
  | "6x2"
  | "6x3"
  | "6x4";

/** Parse "NxM" → { cols, rows }. "AUTO" returns null. */
export function parseMultiGrid(
  g: MultiGrid,
): { cols: number; rows: number } | null {
  if (g === "AUTO") return null;
  const [c, r] = g.split("x").map((v) => Number.parseInt(v, 10));
  if (!Number.isFinite(c) || !Number.isFinite(r)) return null;
  return { cols: c, rows: r };
}

/** Convert millimetres to jsPDF "px" (≈ 1/72 inch). */
function mmToPx(mm: number): number {
  return (mm * 72) / 25.4;
}

/**
 * Tolerance for treating two log-aspect diffs as "the same" for tie-break
 * purposes. Necessary because the cell-aspect ratio is a product of
 * floating-point divisions, so two candidates that are mathematically
 * equivalent (e.g. 2×2 vs 3×3 on a square page) can differ at the 16th
 * decimal place.
 */
const ASPECT_TIE_EPSILON = 1e-9;

/**
 * Curated candidate grids for AUTO. The runner always renders through one
 * of these pairs, so the heuristic only needs to pick from this set.
 * Portrait page → portrait-leaning grids (cols ≤ rows) so cells stay tall.
 * Landscape page → landscape-leaning grids (cols ≥ rows) so cells stay wide.
 */
const PORTRAIT_AUTO_CANDIDATES: ReadonlyArray<{ cols: number; rows: number }> =
  [
    { cols: 1, rows: 2 },
    { cols: 2, rows: 2 },
    { cols: 2, rows: 3 },
    { cols: 2, rows: 4 },
    { cols: 2, rows: 5 },
    { cols: 3, rows: 3 },
    { cols: 3, rows: 4 },
    { cols: 3, rows: 5 },
  ];

const LANDSCAPE_AUTO_CANDIDATES: ReadonlyArray<{ cols: number; rows: number }> =
  [
    { cols: 2, rows: 1 },
    { cols: 2, rows: 2 },
    { cols: 3, rows: 2 },
    { cols: 4, rows: 2 },
    { cols: 5, rows: 2 },
    { cols: 3, rows: 3 },
    { cols: 4, rows: 3 },
    { cols: 5, rows: 3 },
  ];

/**
 * Orientation-aware default grid when the user picks "AUTO". When the
 * template document size is known, the heuristic picks the candidate whose
 * cell aspect most closely matches the doc's aspect so items don't get
 * stretched or waste space in the cell. The diff metric is the absolute
 * log-ratio of cellAspect to docAspect (multiplicative — same penalty for
 * "half as wide" and "twice as wide"). Ties break to the lower cell count
 * so each item still prints large enough to read.
 *
 * Without a doc size, falls back to a page-aspect heuristic that picks a
 * reasonable density.
 */
export function autoMultiGrid(
  pageW: number,
  pageH: number,
  docW?: number,
  docH?: number,
): {
  cols: number;
  rows: number;
} {
  if (docW && docH && docW > 0 && docH > 0) {
    const docAspect = docW / docH;
    const pageAspect = pageW / pageH;
    const isPageLandscape = pageAspect >= 1.0;
    const candidates = isPageLandscape
      ? LANDSCAPE_AUTO_CANDIDATES
      : PORTRAIT_AUTO_CANDIDATES;

    // Honour the 3mm sheet margin that the runner's MULTIPLE_PER_PAGE
    // branch applies for AUTO. Gutter is intentionally omitted here — the
    // choice of grid should not depend on the runtime `gutterMm`, and the
    // pixel-level offset is the runner's job.
    const marginPx = mmToPx(3);
    const usableW = Math.max(1, pageW - 2 * marginPx);
    const usableH = Math.max(1, pageH - 2 * marginPx);

    let bestCols = candidates[0].cols;
    let bestRows = candidates[0].rows;
    let bestDiff = Number.POSITIVE_INFINITY;
    let bestCount = Number.POSITIVE_INFINITY;
    for (const c of candidates) {
      const cellW = usableW / c.cols;
      const cellH = usableH / c.rows;
      const cellAspect = cellW / cellH;
      const diff = Math.abs(Math.log(cellAspect / docAspect));
      const count = c.cols * c.rows;
      if (
        diff < bestDiff - ASPECT_TIE_EPSILON ||
        (Math.abs(diff - bestDiff) < ASPECT_TIE_EPSILON && count < bestCount)
      ) {
        bestDiff = diff;
        bestCount = count;
        bestCols = c.cols;
        bestRows = c.rows;
      }
    }
    return { cols: bestCols, rows: bestRows };
  }

  // Pure page-aspect fallback (no doc info).
  const pageAspect = pageW / pageH;
  if (pageAspect > 1.4) return { cols: 4, rows: 2 };
  if (pageAspect > 1.0) return { cols: 3, rows: 3 };
  if (pageAspect > 0.6) return { cols: 2, rows: 2 };
  return { cols: 2, rows: 4 };
}

/** Per-item render payload exposed by the server resolver. */
export interface TemplateExportItem {
  bindings: PosterBindings;
}

/** Server → client payload. Type-only so client components can import it
 * without pulling the server-only service file. */
export interface TemplateExportPayload {
  doc: PosterEditorDocument;
  width: number;
  height: number;
  quality: "SCREEN" | "STANDARD" | "PRINT";
  printLayout: "ONE_PER_PAGE" | "MULTIPLE_PER_PAGE";
  pageSize: "A3" | "A4" | "13X19";
  pageOrientation: "PORTRAIT" | "LANDSCAPE";
  multiGrid: MultiGrid;
  fit: "FIT" | "FILL";
  marginMm: number;
  gutterMm: number;
  bleedMm: number;
  drawCropMarks: boolean;
  /**
   * When `true`, the runner packages the printable PDF together with a
   * same-content `.ai` (Adobe Illustrator) source inside a single `.zip`
   * so the user can download both from one file. When `false`, the
   * runner ships the PDF on its own.
   */
  includeAi: boolean;
  items: TemplateExportItem[];
}
