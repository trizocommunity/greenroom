import type { PosterTemplateType } from "./poster-editor-config";
import type { EditorBackground } from "./poster-editor-types";

export interface TemplateColorScheme {
  background: EditorBackground;
  titleFill: string;
  accentFill: string;
  bodyFill: string;
  mutedFill: string;
  highlightFill: string;
  titleFontFamily?: string;
}

/** High-contrast festival palettes per template type */
export const TEMPLATE_COLOR_SCHEMES: Record<
  PosterTemplateType,
  TemplateColorScheme
> = {
  RESULT: {
    background: {
      type: "gradient",
      color: "#fff7ed",
      gradientFrom: "#ffffff",
      gradientTo: "#fecaca",
    },
    titleFill: "#ca8a04",
    accentFill: "#dc2626",
    bodyFill: "#0f172a",
    mutedFill: "#78716c",
    highlightFill: "#b45309",
    titleFontFamily: '"Libre Baskerville", Georgia, serif',
  },
  TEAM_POINTS: {
    background: {
      type: "solid",
      color: "#ffffff",
    },
    titleFill: "#dc2626",
    accentFill: "#dc2626",
    bodyFill: "#0f172a",
    mutedFill: "#64748b",
    highlightFill: "#b45309",
    titleFontFamily: '"Libre Baskerville", Georgia, serif',
  },
  CANDIDATE_CARD: {
    background: {
      type: "gradient",
      color: "#5b21b6",
      gradientFrom: "#6d28d9",
      gradientTo: "#f59e0b",
    },
    titleFill: "#ffffff",
    accentFill: "#fcd34d",
    bodyFill: "#f1f5f9",
    mutedFill: "#e9d5ff",
    highlightFill: "#22d3ee",
  },
  CERTIFICATE: {
    background: {
      type: "gradient",
      color: "#fffbeb",
      gradientFrom: "#ffffff",
      gradientTo: "#fef3c7",
    },
    titleFill: "#92400e",
    accentFill: "#b45309",
    bodyFill: "#1e293b",
    mutedFill: "#78716c",
    highlightFill: "#ca8a04",
    titleFontFamily: '"Libre Baskerville", Georgia, serif',
  },
};

export function presetBackground(
  templateType: PosterTemplateType,
  withBackground?: boolean,
): EditorBackground {
  const scheme = TEMPLATE_COLOR_SCHEMES[templateType];
  if (withBackground === false) {
    return { type: "solid", color: "#ffffff" };
  }
  return { ...scheme.background };
}
