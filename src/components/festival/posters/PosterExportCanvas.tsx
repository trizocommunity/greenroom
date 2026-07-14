"use client";

import type Konva from "konva";
import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  RegularPolygon,
  Stage,
  Text,
} from "react-konva";
import { konvaShadowProps } from "@/components/editor/editor-konva-props";
import { applyTextCase } from "@/components/editor/editor-utils";
import type {
  EditorElement,
  PosterEditorDocument,
} from "@/components/editor/poster-editor-types";
import {
  documentWithBindings,
  type PosterBindings,
  resolveBindingText,
} from "@/features/posters/services/poster-bindings.service";

// ─── Image loader hook ────────────────────────────────────────────────────────

function useImage(url?: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) {
      setImg(null);
      return;
    }
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setImg(image);
    image.onerror = () => setImg(null);
    image.src = url;
  }, [url]);
  return img;
}

// ─── Element renderers ────────────────────────────────────────────────────────

/** Resolve text content with bindings AND apply textCase transform. */
function resolveText(el: EditorElement, bindings: PosterBindings): string {
  const raw = resolveBindingText(el.bindingKey, bindings, el.text ?? "");
  return applyTextCase(raw, el.textCase);
}

function ExportTextElement({
  el,
  bindings,
}: {
  el: EditorElement;
  bindings: PosterBindings;
}) {
  const content = resolveText(el, bindings);
  const fontSize = el.fontSize ?? 24;
  const textWidth =
    el.width ?? Math.max(fontSize * 2, content.length * fontSize * 0.55);
  const deco = el.textDecoration ?? "";
  const shadow = konvaShadowProps(el);

  return (
    <Group
      x={el.x}
      y={el.y}
      scaleX={el.scaleX ?? 1}
      scaleY={el.scaleY ?? 1}
      opacity={el.opacity ?? 1}
      rotation={el.rotation ?? 0}
      listening={false}
    >
      <Text
        text={content}
        fontSize={fontSize}
        fontFamily={el.fontFamily}
        fontStyle={el.fontStyle}
        fill={el.fill ?? "#0f172a"}
        align={el.align ?? "left"}
        width={textWidth}
        lineHeight={el.lineHeight ?? 1.2}
        letterSpacing={el.letterSpacing ?? 0}
        wrap="word"
        listening={false}
        {...shadow}
      />
      {deco.includes("underline") && (
        <Line
          points={[0, fontSize + 4, textWidth, fontSize + 4]}
          stroke={el.fill ?? "#0f172a"}
          strokeWidth={2}
          listening={false}
        />
      )}
      {deco.includes("line-through") && (
        <Line
          points={[0, fontSize * 0.55, textWidth, fontSize * 0.55]}
          stroke={el.fill ?? "#0f172a"}
          strokeWidth={2}
          listening={false}
        />
      )}
    </Group>
  );
}

function ExportImageElement({ el }: { el: EditorElement }) {
  const img = useImage(el.imageUrl);
  if (!img) return null;
  return (
    <KonvaImage
      x={el.x}
      y={el.y}
      width={el.width ?? 200}
      height={el.height ?? 150}
      image={img}
      opacity={el.opacity ?? 1}
      scaleX={el.scaleX ?? 1}
      scaleY={el.scaleY ?? 1}
      rotation={el.rotation ?? 0}
      listening={false}
    />
  );
}

function ExportQrElement({
  el,
  bindings,
}: {
  el: EditorElement;
  bindings: PosterBindings;
}) {
  const qw = el.width ?? 160;
  const qh = el.height ?? 160;
  return (
    <Group
      x={el.x}
      y={el.y}
      opacity={el.opacity ?? 1}
      rotation={el.rotation ?? 0}
      listening={false}
    >
      <Rect
        width={qw}
        height={qh}
        fill={el.fill ?? "#ffffff"}
        stroke={el.stroke ?? "#cbd5e1"}
        strokeWidth={el.strokeWidth ?? 2}
        dash={[8, 6]}
      />
      <Text
        y={qh / 2 - 8}
        width={qw}
        align="center"
        text={bindings.qrCode ?? "QR"}
        fontSize={14}
        fill="#64748b"
        listening={false}
      />
    </Group>
  );
}

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
  const uri = stage.toDataURL({ pixelRatio: 2 });
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
  scale = 0.35,
  inline = false,
}: {
  doc: PosterEditorDocument;
  bindings: PosterBindings;
  stageRef: React.RefObject<Konva.Stage | null>;
  scale?: number;
  /** Render in normal layout (e.g. publish preview dialog) instead of off-screen. */
  inline?: boolean;
}) {
  // Apply bindings (text substitution) — textCase is handled per-element in ExportTextElement
  const boundDoc = useMemo(
    () => documentWithBindings(doc, bindings, true),
    [doc, bindings],
  );

  const bgImage = useImage(
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
        width={boundDoc.width * scale}
        height={boundDoc.height * scale}
        scaleX={scale}
        scaleY={scale}
      >
        <Layer>
          {/* Clip everything to canvas bounds */}
          <Group
            clipX={0}
            clipY={0}
            clipWidth={boundDoc.width}
            clipHeight={boundDoc.height}
          >
            <ExportBackground doc={boundDoc} bgImage={bgImage} />

            {sorted.map((el) => {
              if (el.type === "text") {
                return (
                  <ExportTextElement key={el.id} el={el} bindings={bindings} />
                );
              }

              if (el.type === "rect") {
                return (
                  <Rect
                    key={el.id}
                    x={el.x}
                    y={el.y}
                    width={el.width ?? 100}
                    height={el.height ?? 80}
                    fill={el.fill}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    cornerRadius={el.cornerRadius ?? 0}
                    opacity={el.opacity ?? 1}
                    scaleX={el.scaleX ?? 1}
                    scaleY={el.scaleY ?? 1}
                    rotation={el.rotation ?? 0}
                    listening={false}
                    {...konvaShadowProps(el)}
                  />
                );
              }

              if (el.type === "circle") {
                return (
                  <Circle
                    key={el.id}
                    x={el.x}
                    y={el.y}
                    radius={el.radius ?? 50}
                    fill={el.fill}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    opacity={el.opacity ?? 1}
                    rotation={el.rotation ?? 0}
                    listening={false}
                    {...konvaShadowProps(el)}
                  />
                );
              }

              if (el.type === "triangle") {
                return (
                  <RegularPolygon
                    key={el.id}
                    x={el.x}
                    y={el.y}
                    sides={3}
                    radius={el.radius ?? 60}
                    fill={el.fill}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    opacity={el.opacity ?? 1}
                    rotation={el.rotation ?? 0}
                    listening={false}
                    {...konvaShadowProps(el)}
                  />
                );
              }

              if (el.type === "line") {
                return (
                  <Line
                    key={el.id}
                    x={el.x}
                    y={el.y}
                    points={el.points ?? [0, 0, 200, 0]}
                    stroke={el.stroke ?? "#0f172a"}
                    strokeWidth={el.strokeWidth ?? 4}
                    opacity={el.opacity ?? 1}
                    rotation={el.rotation ?? 0}
                    listening={false}
                  />
                );
              }

              if (el.type === "qr") {
                return (
                  <ExportQrElement key={el.id} el={el} bindings={bindings} />
                );
              }

              if (el.type === "image" && el.imageUrl) {
                return <ExportImageElement key={el.id} el={el} />;
              }

              return null;
            })}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
}
