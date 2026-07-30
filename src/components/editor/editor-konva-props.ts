import type { EditorElement } from "./poster-editor-types";

export function konvaShadowProps(el: EditorElement) {
  if (!el.shadowColor || el.shadowBlur === undefined) return {};
  return {
    shadowColor: el.shadowColor,
    shadowBlur: el.shadowBlur,
    shadowOffset: {
      x: el.shadowOffsetX ?? 0,
      y: el.shadowOffsetY ?? 0,
    },
    shadowOpacity: el.shadowOpacity ?? 0.35,
  };
}
