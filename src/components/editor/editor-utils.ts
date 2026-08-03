import type {
  EditorElement,
  PosterEditorDocument,
} from "./poster-editor-types";

export function cloneDoc(doc: PosterEditorDocument): PosterEditorDocument {
  return structuredClone(doc);
}

/** Coerce invalid numeric state (e.g. mid-transform) to a safe fallback. */
export function finiteNumber(
  value: number | undefined,
  fallback: number,
): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function safeRound(value: number | undefined, fallback = 0): number {
  return Math.round(finiteNumber(value, fallback));
}

export function normalizeColor(color?: string): string {
  if (!color) return "";
  return color.trim().toLowerCase();
}

export function applyTextCase(
  text: string,
  textCase?: EditorElement["textCase"],
) {
  if (textCase === "upper") return text.toUpperCase();
  if (textCase === "lower") return text.toLowerCase();
  return text;
}

export function estimateTextWidth(text: string, fontSize: number): number {
  return Math.max(fontSize * 2, text.length * fontSize * 0.55);
}

/** Raw template text for the selection panel editor (not preview/mock display). */
export function getEditableText(el: EditorElement): string {
  return el.text ?? "";
}

export type CopiedElementStyle = Pick<
  EditorElement,
  | "fill"
  | "stroke"
  | "strokeWidth"
  | "fontSize"
  | "fontFamily"
  | "fontStyle"
  | "align"
  | "textDecoration"
  | "textCase"
  | "opacity"
>;

export function extractStyle(el: EditorElement): CopiedElementStyle {
  return {
    fill: el.fill,
    stroke: el.stroke,
    strokeWidth: el.strokeWidth,
    fontSize: el.fontSize,
    fontFamily: el.fontFamily,
    fontStyle: el.fontStyle,
    align: el.align,
    textDecoration: el.textDecoration,
    textCase: el.textCase,
    opacity: el.opacity,
  };
}
