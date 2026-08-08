import type { PosterTemplateType } from "./poster-editor-config";
import type { EditorElement } from "./poster-editor-types";

export const CANVAS_SIZE_MIN = 320;
export const CANVAS_SIZE_MAX = 5000;

export interface CanvasSizePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  types?: PosterTemplateType[];
}

export const CANVAS_SIZE_PRESETS: CanvasSizePreset[] = [
  {
    id: "result-default",
    label: "1200 × 1600",
    width: 1200,
    height: 1600,
    types: ["RESULT", "TEAM_POINTS"],
  },
  {
    id: "result-hd",
    label: "1080 × 1920 (Story)",
    width: 1080,
    height: 1920,
    types: ["RESULT", "TEAM_POINTS"],
  },
  {
    id: "result-a4",
    label: "2480 × 3508 (A4 print)",
    width: 2480,
    height: 3508,
    types: ["RESULT", "TEAM_POINTS"],
  },
  {
    id: "card-default",
    label: "1050 × 600",
    width: 1050,
    height: 600,
    types: ["CANDIDATE_CARD"],
  },
  {
    id: "card-wide",
    label: "1200 × 675",
    width: 1200,
    height: 675,
    types: ["CANDIDATE_CARD"],
  },
  {
    id: "square",
    label: "1080 × 1080",
    width: 1080,
    height: 1080,
  },
];

export function clampCanvasDimension(value: number) {
  return Math.min(
    CANVAS_SIZE_MAX,
    Math.max(CANVAS_SIZE_MIN, Math.round(value)),
  );
}

export function presetsForTemplate(type: PosterTemplateType) {
  return CANVAS_SIZE_PRESETS.filter((p) => !p.types || p.types.includes(type));
}

/** Stretch full-width accent bars when canvas width/height changes. */
export function adaptElementsToCanvasSize(
  elements: EditorElement[],
  prevW: number,
  prevH: number,
  nextW: number,
  nextH: number,
) {
  return elements.map((el) => {
    if (el.type !== "rect" || el.width === undefined) return el;
    const spansFullWidth = el.x <= 2 && Math.abs(el.width - prevW) < 8;
    const anchoredBottom =
      el.y + (el.height ?? 0) >= prevH - 8 && spansFullWidth;
    if (spansFullWidth && !anchoredBottom) {
      return { ...el, width: nextW };
    }
    if (anchoredBottom) {
      const h = el.height ?? 0;
      return { ...el, width: nextW, y: nextH - h };
    }
    return el;
  });
}
