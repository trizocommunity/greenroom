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

export function createPresetDocument(
  templateType: PosterTemplateType,
  options: CreatePresetOptions = {},
): PosterEditorDocument {
  const meta = TEMPLATE_TYPES.find((t) => t.type === templateType)!;
  const scheme = TEMPLATE_COLOR_SCHEMES[templateType];
  const elements: EditorElement[] = [];
  const teamCount = Math.min(20, Math.max(1, options.teamCount ?? 8));
  const useColorBg = options.withBackground !== false;
  const background: EditorBackground = options.backgroundImageUrl
    ? {
        type: "image",
        color:
          scheme.background.type === "solid"
            ? scheme.background.color
            : "#ffffff",
        imageUrl: options.backgroundImageUrl,
      }
    : templateType === "TEAM_POINTS"
      ? { type: "solid", color: "#ffffff" }
      : presetBackground(templateType, useColorBg);

  if (templateType === "CANDIDATE_CARD") {
    elements.push(
      accentBar(0, 12, scheme.highlightFill, meta.width),
      fieldText("studentName", 56, 340, 64, {
        fontStyle: "bold",
        fill: scheme.titleFill,
        fontFamily: scheme.titleFontFamily,
      }),
      fieldText("chestNumber", 56, 420, 36, {
        text: "Chest No: 0000",
        fill: scheme.accentFill,
        fontStyle: "bold",
      }),
      fieldText("teamName", 56, 470, 36, {
        fontStyle: "bold",
        fill: scheme.bodyFill,
      }),
      fieldText("categoryName", 56, 520, 28, {
        fill: scheme.mutedFill,
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

    elements.push(
      fieldText("categoryName", pad, headerY, 22, {
        text: "Program Category",
        fill: scheme.bodyFill,
        fontFamily: serif,
      }),
      fieldText("programmeName", pad, headerY + 40, 56, {
        text: "Item Name",
        fontStyle: "bold",
        fill: scheme.accentFill,
        fontFamily: sans,
      }),
      fieldText("resultLabel", rightX, headerY, 22, {
        text: "Result",
        fill: scheme.accentFill,
        fontFamily: serif,
        align: "right",
        width: rightColW,
      }),
      fieldText("resultNo", rightX, headerY + 32, 120, {
        text: "34",
        fill: scheme.titleFill,
        fontStyle: "bold",
        fontFamily: sans,
        align: "right",
        width: rightColW,
      }),
      fieldText("winnerName", pad, winnersY, 40, {
        name: "Winner 1",
        text: "SAMPLE WINNER 1",
        fill: scheme.bodyFill,
        fontStyle: "bold",
        fontFamily: sans,
        textCase: "upper",
      }),
      fieldText("placeName", pad, winnersY + 52, 22, {
        name: "Place 1",
        text: "Sample Place",
        fill: scheme.mutedFill,
        fontFamily: serif,
      }),
      fieldText("winnerName", pad, winnersY + winnerStep, 40, {
        name: "Winner 2",
        text: "SAMPLE WINNER 2",
        fill: scheme.bodyFill,
        fontStyle: "bold",
        fontFamily: sans,
        textCase: "upper",
      }),
      fieldText("placeName", pad, winnersY + winnerStep + 52, 22, {
        name: "Place 2",
        text: "Sample Place",
        fill: scheme.mutedFill,
        fontFamily: serif,
      }),
      fieldText("winnerName", pad, winnersY + winnerStep * 2, 40, {
        name: "Winner 3",
        text: "SAMPLE WINNER 3",
        fill: scheme.bodyFill,
        fontStyle: "bold",
        fontFamily: sans,
        textCase: "upper",
      }),
      fieldText("placeName", pad, winnersY + winnerStep * 2 + 52, 22, {
        name: "Place 3",
        text: "Sample Place",
        fill: scheme.mutedFill,
        fontFamily: serif,
      }),
    );

    if (useColorBg) {
      elements.unshift(
        accentBar(0, 12, scheme.highlightFill, meta.width),
        accentBar(meta.height - 16, 16, scheme.accentFill, meta.width),
      );
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
