/**
 * Konva/canvas colors — mirrors src/app/globals.css semantic tokens.
 * UI should prefer Tailwind: primary, background, card, border, muted, sidebar-*.
 */
export const EDITOR_COLORS = {
  primary: "#7c3aed",
  primaryLight: "#a855f7",
  primaryForeground: "#ffffff",
  background: "#020617",
  backgroundSoft: "#0f172a",
  foreground: "#e2e8f0",
  heading: "#ffffff",
  muted: "#1e293b",
  mutedForeground: "#94a3b8",
  border: "#1e293b",
  card: "#0f172a",
  destructive: "#ef4444",
  ring: "#7c3aed",
  /** Canvas workspace (behind artboard) */
  workspace: "#1e293b",
  /** Candidate card / brand gradient */
  gradientFrom: "#7c3aed",
  gradientTo: "#f97316",
  white: "#ffffff",
  black: "#000000",
  /** Figma-style selection transformer (anchors + border) */
  selectionBlue: "#0d99ff",
  /** Smart-guide distance lines and label pills */
  guideRed: "#ff383c",
} as const;

/** @deprecated Import from `./editor-font-catalog` — re-exported for compatibility */
export { BUILTIN_FONTS } from "./editor-font-catalog";

export const BACKGROUND_SWATCHES = [
  EDITOR_COLORS.white,
  EDITOR_COLORS.black,
  EDITOR_COLORS.destructive,
  EDITOR_COLORS.primary,
  EDITOR_COLORS.primaryLight,
  EDITOR_COLORS.foreground,
  "#22c55e",
  EDITOR_COLORS.muted,
  EDITOR_COLORS.backgroundSoft,
  EDITOR_COLORS.gradientTo,
] as const;
