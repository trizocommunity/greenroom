/**
 * Konva/canvas colors — mirrors src/app/globals.css semantic tokens.
 * UI should prefer Tailwind: primary, background, card, border, muted, sidebar-*.
 */
export const EDITOR_COLORS = {
  primary: "#d72626",
  primaryLight: "#f87171",
  primaryForeground: "#ffffff",
  background: "#f7f8fa",
  backgroundSoft: "#ffffff",
  foreground: "#1f2937",
  heading: "#111827",
  muted: "#f3f4f6",
  mutedForeground: "#6b7280",
  border: "#e5e7eb",
  card: "#ffffff",
  destructive: "#b91c1c",
  ring: "#d72626",
  /** Canvas workspace (behind artboard) */
  workspace: "#e5e7eb",
  /** Candidate card / brand gradient */
  gradientFrom: "#d72626",
  gradientTo: "#f25c05",
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
