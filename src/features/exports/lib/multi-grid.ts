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
  | "5x5"
  | "5x6"
  | "6x1"
  | "6x2"
  | "6x3"
  | "6x4"
  | "6x5";

/** Parse "NxM" → { cols, rows }. "AUTO" returns null. */
export function parseMultiGrid(
  g: MultiGrid,
): { cols: number; rows: number } | null {
  if (g === "AUTO") return null;
  const [c, r] = g.split("x").map((v) => Number.parseInt(v, 10));
  if (!Number.isFinite(c) || !Number.isFinite(r)) return null;
  return { cols: c, rows: r };
}

/**
 * Resolve the effective cols × rows for a MULTIPLE_PER_PAGE export. Honors
 * an explicit "COLSxROWS" preset; falls back to the orientation-driven
 * `autoMultiGrid` heuristic when the user picks "AUTO".
 */
export function resolveMultiGrid(
  g: MultiGrid,
  pageW: number,
  pageH: number,
  docW?: number,
  docH?: number,
): { cols: number; rows: number } {
  const explicit = parseMultiGrid(g);
  if (explicit) return explicit;
  return autoMultiGrid(pageW, pageH, docW, docH);
}

/** Convert millimetres to jsPDF "px" (≈ 1/72 inch). */
function mmToPx(mm: number): number {
  return (mm * 72) / 25.4;
}

/** Convert inches to jsPDF "px" (≈ 1/72 inch). */
function inchesToPx(inches: number): number {
  return inches * 72;
}

/**
 * Minimum printable cell edge in inches. Below this, the QR on a candidate
 * card becomes hard to scan in the field. The runner drops any candidate
 * whose cell is smaller on either axis.
 */
export const MIN_PRINTABLE_INCHES = 0.75;

/**
 * Tolerance for treating two log-aspect diffs as "the same" for tie-break
 * purposes. Necessary because the cell-aspect ratio is a product of
 * floating-point divisions, so two candidates that are mathematically
 * equivalent (e.g. 2×2 vs 3×3 on a square page) can differ at the 16th
 * decimal place.
 */
const ASPECT_TIE_EPSILON = 1e-9;

/**
 * Soft aspect-mismatch penalty threshold. Cell aspects whose log-ratio to
 * the doc aspect is below this are treated as a good fit; above it the
 * candidate gets a heavy penalty so density never wins by sacrificing
 * fit beyond a usable visual ratio.
 */
const ASPECT_SOFT_LIMIT = Math.log(2.0); // ~0.693 — cellAspect up to 2× doc
// (3×6 on 13×19 portrait: cell aspect 1.36 vs doc 0.697 → log-diff 0.67;
// relaxing from log(1.5)=0.405 lets 3×6 clear the soft limit while still
// rejecting truly bad fits like 1×6.)

/**
 * Curated candidate grids for AUTO. The runner always renders through one
 * of these pairs, so the heuristic only needs to pick from this set.
 * Portrait page → portrait-leaning grids (cols ≤ rows) so cells stay tall.
 * Landscape page → landscape-leaning grids (cols ≥ rows) so cells stay wide.
 * Denser options (4×4, 4×5, 5×5, 5×6, 6×4) are included so small templates
 * like 2.7×3.9 candidate cards can pack many copies onto a 13×19 sheet.
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
    { cols: 3, rows: 6 },
    { cols: 4, rows: 4 },
    { cols: 4, rows: 5 },
    { cols: 4, rows: 6 },
    { cols: 5, rows: 5 },
    { cols: 5, rows: 6 },
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
    { cols: 6, rows: 3 },
    { cols: 4, rows: 4 },
    { cols: 5, rows: 4 },
    { cols: 6, rows: 4 },
    { cols: 6, rows: 5 },
  ];

/**
 * Minimum template-scale ratio (cell / template) for a layout to count as
 * "no downscale". At a scale of 1.0 the template renders at its native
 * size on the page; below that, Konva rasterises at <1 px-per-source-px
 * and the print gets softer. Match Adobe Illustrator's "Make Guides"
 * behaviour: prefer layouts that keep the template at native size.
 */
const NO_DOWNSCALE_THRESHOLD = 1.0;

/**
 * Orientation-aware default grid when the user picks "AUTO". When the
 * template document size is known, the heuristic first looks for a
 * layout where the template fits at native size (≥1:1) within the aspect
 * tolerance, then **density-first within that subset**. If no such layout
 * exists (the template is too large for the sheet at native size), it
 * falls back to density-first across every valid candidate so a smaller
 * downscale is picked over no layout at all. Each candidate is rejected
 * outright if either cell edge drops below MIN_PRINTABLE_INCHES, so QR
 * readability is preserved.
 *
 * Selection rules (in order):
 *   1. Restrict to candidates whose template-scale ≥ NO_DOWNSCALE_THRESHOLD
 *      AND whose cell aspect is within ASPECT_SOFT_LIMIT of the doc aspect.
 *      (No-downscale preference; matches Adobe Illustrator.)
 *   2. Within that subset, pick the densest (most cards); on ties, the
 *      candidate whose cell aspect is closest to the doc aspect.
 *   3. If no candidate satisfies (1), fall back to density-first across
 *      every printable candidate so the user always gets a result.
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
    const minCellPx = inchesToPx(MIN_PRINTABLE_INCHES);

    // Phase 1: evaluate every printable candidate once. The "scale" assumes
    // the template is designed at the CSS-standard 96 DPI: 1 px = 1/96 in
    // and 1 pt = 1/72 in, so cell-inches = cellW_pt/72, doc-inches = docW_px/96,
    // and scale = (cellW_pt × 96/72) / docW_px = cellW_pt × 4/3 / docW_px.
    // We take the min across both axes; scale ≥ 1 means the template fits
    // at native size in the cell.
    interface Evaluated {
      cols: number;
      rows: number;
      count: number;
      aspectDiff: number;
      scale: number;
    }
    const evaluated: Evaluated[] = [];
    for (const c of candidates) {
      const cellW = usableW / c.cols;
      const cellH = usableH / c.rows;
      if (cellW < minCellPx || cellH < minCellPx) continue;

      const cellAspect = cellW / cellH;
      const aspectDiff = Math.abs(Math.log(cellAspect / docAspect));
      const scale = Math.min(
        (cellW * (4 / 3)) / docW,
        (cellH * (4 / 3)) / docH,
      );
      evaluated.push({
        cols: c.cols,
        rows: c.rows,
        count: c.cols * c.rows,
        aspectDiff,
        scale,
      });
    }

    if (evaluated.length === 0) {
      return { cols: candidates[0].cols, rows: candidates[0].rows };
    }

    // Phase 2: prefer no-downscale within aspect tolerance. If we have any,
    // density-first selection runs only on those.
    const noDownscale = evaluated.filter(
      (c) =>
        c.scale >= NO_DOWNSCALE_THRESHOLD && c.aspectDiff <= ASPECT_SOFT_LIMIT,
    );
    const pool = noDownscale.length > 0 ? noDownscale : evaluated;

    // Phase 3: density-first on the pool. Within the pool the aspect gate
    // is either already passed (no-downscale branch) or irrelevant
    // (fallback branch — every candidate was printable but no no-downscale
    // option existed).
    let best = pool[0];
    let bestCount = best.count;
    let bestAspectDiff = best.aspectDiff;
    for (const c of pool) {
      if (c.count > bestCount) {
        best = c;
        bestCount = c.count;
        bestAspectDiff = c.aspectDiff;
      } else if (c.count === bestCount && c.aspectDiff < bestAspectDiff) {
        best = c;
        bestCount = c.count;
        bestAspectDiff = c.aspectDiff;
      }
    }
    return { cols: best.cols, rows: best.rows };
  }

  // Pure page-aspect fallback (no doc info). Mirror the historical behaviour.
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
 *  without pulling the server-only service file. */
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
   * Output format selected at the export footer.
   *  - PDF:  standalone printable PDF.
   *  - AI:   same PDF bytes under a `.ai` extension (`.ai` is a PDF
   *         wrapper; Illustrator opens it as a multi-artboard PDF).
   *  - BOTH: a single `.zip` containing both `name.pdf` and `name.ai`.
   */
  outputFormat: "PDF" | "AI" | "BOTH";
  items: TemplateExportItem[];
}
