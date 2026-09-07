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

// ─── Blob URL sanitisation ────────────────────────────────────────────────────

/** Returns true for temporary browser-only `blob:` URLs. */
export function isBlobUrl(url: string | undefined | null): boolean {
  return typeof url === "string" && url.startsWith("blob:");
}

export interface SanitiseResult {
  /** Document with all blob: URLs stripped (safe to persist). */
  doc: PosterEditorDocument;
  /** True when at least one blob: URL was found and removed. */
  hasPendingUploads: boolean;
}

/**
 * Strip `blob:` URLs from a document so it is safe to persist.
 *
 * Background images revert to a solid-colour fallback; image elements and
 * custom fonts with blob URLs are removed entirely — they will be re-added
 * once the Cloudinary upload completes and a permanent URL replaces the blob.
 */
export function sanitizeDocumentForSave(
  doc: PosterEditorDocument,
): SanitiseResult {
  let hasPendingUploads = false;

  // Background
  let background = doc.background;
  if (background.type === "image" && isBlobUrl(background.imageUrl)) {
    hasPendingUploads = true;
    background = { ...background, type: "solid", imageUrl: undefined };
  }

  // Elements — drop image elements that still have a blob URL
  const elements = doc.elements.filter((el) => {
    if (el.type === "image" && isBlobUrl(el.imageUrl)) {
      hasPendingUploads = true;
      return false;
    }
    return true;
  });

  // Custom fonts — drop fonts that still have a blob URL
  const customFonts = doc.customFonts.filter((f) => {
    if (isBlobUrl(f.url)) {
      hasPendingUploads = true;
      return false;
    }
    return true;
  });

  if (!hasPendingUploads) {
    return { doc, hasPendingUploads: false };
  }

  return {
    doc: { ...doc, background, elements, customFonts },
    hasPendingUploads: true,
  };
}
