import { EDITOR_FONT_CATALOG } from "./editor-font-catalog";
import type { EditorElement } from "./poster-editor-types";

export function fontLabelForFamily(family?: string): string {
  if (!family) return "Outfit";
  const hit = EDITOR_FONT_CATALOG.find((f) => f.family === family);
  if (hit) return hit.label;
  return family.split(",")[0]?.replace(/['"]/g, "").trim() ?? "Font";
}

export function toggleFontStyle(
  el: EditorElement,
  part: "bold" | "italic",
): string {
  const bold = el.fontStyle?.includes("bold");
  const italic = el.fontStyle?.includes("italic");
  if (part === "bold") {
    if (bold) return italic ? "italic" : "normal";
    return italic ? "bold italic" : "bold";
  }
  if (italic) return bold ? "bold" : "normal";
  return bold ? "bold italic" : "italic";
}

export function stepFontSize(current: number, delta: number): number {
  return Math.min(200, Math.max(8, current + delta));
}
