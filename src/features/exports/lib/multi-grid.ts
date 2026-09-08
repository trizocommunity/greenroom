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

/**
 * Orientation-aware default grid when the user picks "AUTO":
 *   landscape page → 4 × 2 = 8 per page
 *   square-ish     → 3 × 3 = 9 per page
 *   portrait A4    → 2 × 2 = 4 per page
 *   tall portrait  → 2 × 4 = 8 per page
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
  const pageAspect = pageW / pageH;
  const isPageLandscape = pageAspect >= 1.0;

  if (docW && docH && docW > 0 && docH > 0) {
    const docAspect = docW / docH;
    const isDocLandscape = docAspect >= 1.15;

    if (isPageLandscape) {
      // Wide sheet (e.g. A4 landscape, 13x19 landscape)
      if (isDocLandscape) {
        return pageAspect > 1.5 ? { cols: 4, rows: 2 } : { cols: 3, rows: 2 };
      }
      return { cols: 4, rows: 2 };
    }

    // Portrait sheet (e.g. A4 portrait, 13x19 portrait)
    if (isDocLandscape) {
      // Wide template on portrait sheet: 2 columns × 4 rows provides wide cells
      return pageAspect < 0.6 ? { cols: 2, rows: 5 } : { cols: 2, rows: 4 };
    }
    return pageAspect < 0.6 ? { cols: 2, rows: 3 } : { cols: 2, rows: 2 };
  }

  // Pure page-aspect fallback
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
  items: TemplateExportItem[];
}
