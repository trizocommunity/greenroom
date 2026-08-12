import type {
  CreatePresetOptions,
  EditorElementType,
  PosterTemplateType,
} from "./poster-editor-config";

export interface EditorElement {
  id: string;
  type: EditorElementType;
  name: string;
  bindingKey?: string;
  visible: boolean;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  rotation?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  align?: "left" | "center" | "right" | "justify";
  textDecoration?: "underline" | "line-through" | "underline line-through";
  textCase?: "none" | "upper" | "lower";
  lineHeight?: number;
  letterSpacing?: number;
  /** Drop shadow */
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  cornerRadius?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  locked?: boolean;
  imageUrl?: string;
  zIndex: number;
}

export interface EditorBackground {
  type: "solid" | "image" | "gradient";
  color: string;
  imageUrl?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

export interface CustomFont {
  id: string;
  name: string;
  url: string;
}

export interface PosterEditorDocument {
  templateType: PosterTemplateType;
  width: number;
  height: number;
  background: EditorBackground;
  elements: EditorElement[];
  customFonts: CustomFont[];
  createOptions?: CreatePresetOptions;
  /** User-facing name when saved to library */
  templateName?: string;
  /** Set when loaded from or saved to template library */
  savedTemplateId?: string | null;
  updatedAt: string;
}
