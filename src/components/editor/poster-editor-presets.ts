import { v4 as uuid } from "uuid";
import { EDITOR_COLORS } from "./editor-theme";
import {
  type CreatePresetOptions,
  MOCK_BINDINGS,
  type PosterTemplateType,
  TEMPLATE_TYPES,
} from "./poster-editor-config";
import {
  presetBackground,
  TEMPLATE_COLOR_SCHEMES,
} from "./poster-editor-palettes";
import type {
  EditorBackground,
  EditorElement,
  PosterEditorDocument,
} from "./poster-editor-types";

function fieldText(
  bindingKey: string,
  x: number,
  y: number,
  fontSize: number,
  opts?: Partial<EditorElement>,
): EditorElement {
  const preview = MOCK_BINDINGS[bindingKey] ?? `{{${bindingKey}}}`;
  return {
    id: uuid(),
    type: "text",
    name: bindingKey,
    bindingKey,
    visible: true,
    x,
    y,
    text: preview,
    fontSize,
    fontFamily: "Outfit, system-ui, sans-serif",
    fill: EDITOR_COLORS.foreground,
    align: "left",
    zIndex: opts?.zIndex ?? 10,
    ...opts,
  };
}

function staticText(
  name: string,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  opts?: Partial<EditorElement>,
): EditorElement {
  return {
    id: uuid(),
    type: "text",
    name,
    visible: true,
    x,
    y,
    text,
    fontSize,
    fontFamily: "Outfit, system-ui, sans-serif",
    fill: EDITOR_COLORS.foreground,
    align: "left",
    zIndex: opts?.zIndex ?? 10,
    ...opts,
  };
}

function accentBar(
  y: number,
  height: number,
  fill: string,
  width = 1200,
): EditorElement {
  return {
    id: uuid(),
    type: "rect",
    name: "Accent bar",
    visible: true,
    x: 0,
    y,
    width,
    height,
    fill,
    zIndex: 1,
  };
}

function qrPlaceholder(x: number, y: number, size: number): EditorElement {
  return {
    id: uuid(),
    type: "qr",
    name: "QR Code",
    bindingKey: "qrCode",
    visible: true,
    x,
    y,
    width: size,
    height: size,
    fill: EDITOR_COLORS.white,
    stroke: EDITOR_COLORS.mutedForeground,
    strokeWidth: 2,
    zIndex: 20,
  };
}

/** Default background image bundled in /public/editor/ */
const DEFAULT_BG_IMAGE_URL = "/editor/default-poster-bg.jpg";

export function createPresetDocument(
  templateType: PosterTemplateType,
  options: CreatePresetOptions = {},
): PosterEditorDocument {
  const meta = TEMPLATE_TYPES.find((t) => t.type === templateType)!;
  const scheme = TEMPLATE_COLOR_SCHEMES[templateType];
  const elements: EditorElement[] = [];
  const teamCount = Math.min(20, Math.max(1, options.teamCount ?? 8));
  const useColorBg = options.withBackground !== false;

  // For blank RESULT/CANDIDATE_CARD, use the default bundled background image
  const useDefaultBgImage =
    !options.backgroundImageUrl &&
    options.withBackground !== false &&
    (templateType === "RESULT" || templateType === "CANDIDATE_CARD");

  const background: EditorBackground = options.backgroundImageUrl
    ? {
        type: "image",
        color:
          scheme.background.type === "solid"
            ? scheme.background.color
            : "#1a1a1a",
        imageUrl: options.backgroundImageUrl,
      }
    : useDefaultBgImage
      ? {
          type: "image",
          color: "#1a1a1a",
          imageUrl: DEFAULT_BG_IMAGE_URL,
        }
      : templateType === "TEAM_POINTS"
        ? { type: "solid", color: "#ffffff" }
        : presetBackground(templateType, useColorBg);

  // When using an image background (uploaded or default), use light text colors
  const hasImageBackground = background.type === "image";

  if (templateType === "CANDIDATE_CARD") {
    const titleFill = hasImageBackground ? "#ffffff" : scheme.titleFill;
    const accentFill = hasImageBackground ? "#fbbf24" : scheme.accentFill;
    const bodyFill = hasImageBackground ? "#f1f5f9" : scheme.bodyFill;
    const mutedFill = hasImageBackground ? "#cbd5e1" : scheme.mutedFill;
    const highlightFill = hasImageBackground ? "#fbbf24" : scheme.highlightFill;

    elements.push(
      accentBar(0, 12, highlightFill, meta.width),
      fieldText("studentName", 56, 340, 64, {
        fontStyle: "bold",
        fill: titleFill,
        fontFamily: scheme.titleFontFamily,
      }),
      fieldText("chestNumber", 56, 420, 36, {
        text: "Chest No: 0000",
        fill: accentFill,
        fontStyle: "bold",
      }),
      fieldText("teamName", 56, 470, 36, {
        fontStyle: "bold",
        fill: bodyFill,
      }),
      fieldText("categoryName", 56, 520, 28, {
        fill: mutedFill,
      }),
      qrPlaceholder(760, 280, 240),
    );
  }

  if (templateType === "RESULT") {
    const pad = 96;
    const headerY = 96;
    const rightColW = 400;
    const rightX = meta.width - pad - rightColW;
    const winnersY = 320;
    const winnerStep = 140;
    const serif = scheme.titleFontFamily;
    const sans = "Outfit, system-ui, sans-serif";

    const titleFill = hasImageBackground ? "#ffffff" : scheme.titleFill;
    const accentFill = hasImageBackground ? "#fbbf24" : scheme.accentFill;
    const bodyFill = hasImageBackground ? "#f8fafc" : scheme.bodyFill;
    const mutedFill = hasImageBackground ? "#cbd5e1" : scheme.mutedFill;
    const highlightFill = hasImageBackground ? "#fbbf24" : scheme.highlightFill;

    elements.push(
      fieldText("categoryName", pad, headerY, 22, {
        text: "Program Category",
        fill: bodyFill,
        fontFamily: serif,
      }),
      fieldText("programmeName", pad, headerY + 40, 56, {
        text: "Item Name",
        fontStyle: "bold",
        fill: accentFill,
        fontFamily: sans,
      }),
      fieldText("resultLabel", rightX, headerY, 22, {
        text: "Result",
        fill: accentFill,
        fontFamily: serif,
        align: "right",
        width: rightColW,
      }),
      fieldText("resultNo", rightX, headerY + 32, 120, {
        text: "34",
        fill: titleFill,
        fontStyle: "bold",
        fontFamily: sans,
        align: "right",
        width: rightColW,
      }),
      fieldText("winner1Name", pad, winnersY, 40, {
        name: "Winner 1",
        fill: bodyFill,
        fontStyle: "bold",
        fontFamily: sans,
        textCase: "upper",
      }),
      fieldText("winner1Team", pad, winnersY + 52, 22, {
        name: "Place 1",
        fill: mutedFill,
        fontFamily: serif,
      }),
      fieldText("winner2Name", pad, winnersY + winnerStep, 40, {
        name: "Winner 2",
        fill: bodyFill,
        fontStyle: "bold",
        fontFamily: sans,
        textCase: "upper",
      }),
      fieldText("winner2Team", pad, winnersY + winnerStep + 52, 22, {
        name: "Place 2",
        fill: mutedFill,
        fontFamily: serif,
      }),
      fieldText("winner3Name", pad, winnersY + winnerStep * 2, 40, {
        name: "Winner 3",
        fill: bodyFill,
        fontStyle: "bold",
        fontFamily: sans,
        textCase: "upper",
      }),
      fieldText("winner3Team", pad, winnersY + winnerStep * 2 + 52, 22, {
        name: "Place 3",
        fill: mutedFill,
        fontFamily: serif,
      }),
    );

    // Accent bars for non-image backgrounds
    if (!hasImageBackground && useColorBg) {
      elements.unshift(
        accentBar(0, 12, highlightFill, meta.width),
        accentBar(meta.height - 16, 16, accentFill, meta.width),
      );
    } else if (hasImageBackground) {
      // Subtle top accent bar for image backgrounds
      elements.unshift(accentBar(0, 8, highlightFill, meta.width));
    }
  }

  if (templateType === "TEAM_POINTS") {
    const marginX = 80;
    const contentWidth = meta.width - marginX * 2;
    const teamColX = marginX + 40;
    const teamColWidth = 640;
    const scoreColX = meta.width - marginX - 220;
    const scoreColWidth = 220;
    const titleY = 72;
    const festY = 168;
    const rowAreaTop = 280;
    const rowAreaBottom = meta.height - 80;
    const rowAreaHeight = rowAreaBottom - rowAreaTop;
    const rowHeight = Math.max(
      48,
      Math.min(76, Math.floor(rowAreaHeight / teamCount)),
    );
    const rowsBlockHeight = teamCount * rowHeight;
    const rowStartY =
      rowAreaTop + Math.floor((rowAreaHeight - rowsBlockHeight) / 2);

    elements.push(
      staticText("Section title", "After 10 Results", marginX, titleY, 48, {
        fill: scheme.titleFill,
        fontFamily: scheme.titleFontFamily,
        fontStyle: "bold",
        align: "center",
        width: contentWidth,
      }),
      fieldText("festName", marginX, festY, 28, {
        fontStyle: "bold",
        fill: scheme.mutedFill,
        align: "center",
        width: contentWidth,
      }),
      fieldText("festDate", marginX, festY + 36, 20, {
        fill: scheme.mutedFill,
        align: "center",
        width: contentWidth,
      }),
    );

    for (let i = 0; i < teamCount; i++) {
      const y = rowStartY + i * rowHeight;
      elements.push(
        staticText(`Team ${i + 1}`, `Team ${i + 1}`, teamColX, y, 36, {
          fill: scheme.bodyFill,
          fontStyle: "bold",
          align: "left",
          width: teamColWidth,
        }),
        staticText(`Points ${i + 1}`, "0", scoreColX, y, 36, {
          fill: scheme.accentFill,
          fontStyle: "bold",
          align: "right",
          width: scoreColWidth,
        }),
      );
    }
  }

  return {
    templateType,
    width: meta.width,
    height: meta.height,
    background,
    elements,
    customFonts: [],
    createOptions: options,
    updatedAt: new Date().toISOString(),
  };
}
