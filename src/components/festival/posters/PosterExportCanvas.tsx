"use client";

import type Konva from "konva";
import { useEffect, useMemo, useState } from "react";
import { Group, Image as KonvaImage, Layer, Rect, Stage } from "react-konva";
import {
  buildGoogleFontsCssUrl,
  documentFontsFromElements,
} from "@/components/editor/editor-font-catalog";
import { applyTextCase } from "@/components/editor/editor-utils";
import {
  type ElementDragHandlers,
  PosterElementRenderer,
} from "@/components/editor/PosterElementRenderer";
import { MOCK_BINDINGS } from "@/components/editor/poster-editor-config";
import type {
  EditorElement,
  PosterEditorDocument,
} from "@/components/editor/poster-editor-types";
import { useKonvaImage } from "@/components/editor/poster-image-loader";
import {
  documentWithBindings,
  type PosterBindings,
  resolveBindingText,
} from "@/features/posters/services/poster-bindings.service";

// ─── Element renderers ────────────────────────────────────────────────────────

/** Resolve text content with bindings AND apply textCase transform. */
function resolveText(el: EditorElement, bindings: PosterBindings): string {
  const raw = resolveBindingText(el.bindingKey, bindings, el.text ?? "");
  return applyTextCase(raw, el.textCase);
}

const NO_HOVER = { onMouseEnter: () => {}, onMouseLeave: () => {} };
const NO_DRAG: ElementDragHandlers = {
  onDragStart: () => {},
  onDragMove: () => {},
  onDragEnd: () => {},
};

// ─── Background renderer ──────────────────────────────────────────────────────

function ExportBackground({
  doc,
  bgImage,
}: {
  doc: PosterEditorDocument;
  bgImage: HTMLImageElement | null;
}) {
  const { width, height, background } = doc;

  if (background.type === "solid") {
    return (
      <Rect x={0} y={0} width={width} height={height} fill={background.color} />
    );
  }

  if (background.type === "gradient") {
    return (
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: width, y: height }}
        fillLinearGradientColorStops={[
          0,
          background.gradientFrom ?? "#111",
          1,
          background.gradientTo ?? "#333",
        ]}
      />
    );
  }

  if (background.type === "image" && bgImage) {
    return (
      <KonvaImage x={0} y={0} width={width} height={height} image={bgImage} />
    );
  }

  // Fallback: solid color from background.color
  return (
    <Rect
      x={0}
      y={0}
      width={width}
      height={height}
      fill={background.color ?? "#ffffff"}
    />
  );
}

// ─── Export utilities ─────────────────────────────────────────────────────────

export function exportStagePng(stage: Konva.Stage | null, filename: string) {
  if (!stage) return;
  const currentScale = stage.scaleX() || 1;
  const pixelRatio = Math.max(2, 2 / currentScale);
  const uri = stage.toDataURL({ pixelRatio });
  const a = document.createElement("a");
  a.href = uri;
  a.download = filename;
  a.click();
}

// ─── Main export canvas ───────────────────────────────────────────────────────

export function PosterExportCanvas({
  doc,
  bindings,
  stageRef,
  scale,
  inline = false,
}: {
  doc: PosterEditorDocument;
  bindings: PosterBindings;
  stageRef?: React.RefObject<Konva.Stage | null>;
  scale?: number;
  /** Render in normal layout (e.g. publish preview dialog) instead of off-screen. */
  inline?: boolean;
}) {
  const effectiveScale = scale ?? (inline ? 0.35 : 1);

  // Preview callers (template list drawer, NewExportDrawer picker) pass an
  // empty `bindings={{}}` to render the template without per-participant
  // data. Fall back to MOCK_BINDINGS so QR elements get a sample payload
  // instead of an empty string (which would skip rendering entirely in
  // `PosterElementRenderer`).
  const effectiveBindings =
    Object.keys(bindings).length === 0
      ? (MOCK_BINDINGS as PosterBindings)
      : bindings;

  // Apply bindings (text substitution) — textCase is handled per-element in ExportTextElement
  const boundDoc = useMemo(
    () => documentWithBindings(doc, effectiveBindings, true),
    [doc, effectiveBindings],
  );

  // Eagerly load fonts used in this specific document so export renders correctly
  useEffect(() => {
    if (!boundDoc.elements) return;
    const fonts = documentFontsFromElements(boundDoc.elements).filter(
      (f) => f.googleFamily,
    );
    for (const font of fonts) {
      const id = `greenroom-editor-font-${font.id}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = buildGoogleFontsCssUrl([font]);
        document.head.appendChild(link);
      }
    }
  }, [boundDoc.elements]);

  const bgImage = useKonvaImage(
    boundDoc.background.type === "image"
      ? boundDoc.background.imageUrl
      : undefined,
  );

  const sorted = [...boundDoc.elements]
    .filter((e) => e.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      className={
        inline
          ? "inline-block overflow-hidden rounded-lg border border-border bg-muted/30 shadow-sm"
          : "pointer-events-none fixed -left-[9999px] top-0 opacity-0"
      }
    >
      <Stage
        ref={stageRef}
        width={boundDoc.width * effectiveScale}
        height={boundDoc.height * effectiveScale}
        scaleX={effectiveScale}
        scaleY={effectiveScale}
      >
        <Layer
          imageSmoothingEnabled
          ref={(layer) => {
            if (layer) {
              const ctx = (layer as any).getCanvas()?.getContext()?._context;
              if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
              }
            }
          }}
        >
          {/* Clip everything to canvas bounds */}
          <Group
            clipX={0}
            clipY={0}
            clipWidth={boundDoc.width}
            clipHeight={boundDoc.height}
          >
            <ExportBackground doc={boundDoc} bgImage={bgImage} />

            {sorted.map((el) => {
              const display =
                el.type === "text"
                  ? resolveText(el, effectiveBindings)
                  : el.type === "qr"
                    ? effectiveBindings.qrCode || ""
                    : "";

              return (
                <PosterElementRenderer
                  key={el.id}
                  el={el}
                  interactive={false}
                  previewMode={true}
                  draggable={false}
                  nodeOpacity={el.opacity ?? 1}
                  displayText={display}
                  hoverHandlers={NO_HOVER}
                  dragHandlers={NO_DRAG}
                />
              );
            })}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
}
