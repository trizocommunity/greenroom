"use client";

/**
 * Formerly eagerly loaded all Google Fonts, now handled lazily by EditorFontsPanel.
 * Kept as no-op to avoid breaking imports if any.
 */
export function EditorFontsLoader() {
  return null;
}
