import type Konva from "konva";
import QRCodeStyling from "qr-code-styling";
import { useEffect, useState } from "react";
import {
  Circle,
  Group,
  Image as KonvaImage,
  Line,
  Rect,
  RegularPolygon,
  Text,
} from "react-konva";
import { konvaShadowProps } from "./editor-konva-props";
import { EDITOR_COLORS } from "./editor-theme";
import { estimateTextWidth, getEditableText } from "./editor-utils";
import type { EditorElement } from "./poster-editor-types";
import type { ElementHoverHandlers } from "./use-canvas-element-hover";

export type ElementDragHandlers = {
  onDragStart: () => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
};

export interface PosterElementRendererProps {
  el: EditorElement;
  interactive: boolean;
  previewMode: boolean;
  draggable: boolean;
  nodeOpacity: number;
  displayText: string;
  onSelect?: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDblClick?: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  hoverHandlers: ElementHoverHandlers;
  dragHandlers: ElementDragHandlers;
  onBoundsChange?: () => void;
}

function ImageElement({
  el,
  onSelect,
  hoverHandlers,
  dragHandlers,
  draggable,
  nodeOpacity,
  onBoundsChange,
}: Omit<
  PosterElementRendererProps,
  "interactive" | "previewMode" | "displayText"
>) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!el.imageUrl) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = el.imageUrl;
  }, [el.imageUrl]);

  if (!image) return null;

  return (
    <Group
      id={el.id}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation ?? 0}
      scaleX={el.scaleX ?? 1}
      scaleY={el.scaleY ?? 1}
      opacity={nodeOpacity}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onMouseEnter={hoverHandlers.onMouseEnter}
      onMouseLeave={hoverHandlers.onMouseLeave}
      onDragStart={dragHandlers.onDragStart}
      onDragMove={dragHandlers.onDragMove}
      onDragEnd={(e) => {
        dragHandlers.onDragEnd(e);
        onBoundsChange?.();
      }}
      clipFunc={
        el.cornerRadius && el.width && el.height
          ? (ctx) => {
              ctx.beginPath();
              ctx.roundRect(0, 0, el.width!, el.height!, el.cornerRadius!);
              ctx.closePath();
            }
          : undefined
      }
    >
      <KonvaImage
        image={image}
        width={el.width}
        height={el.height}
      />
    </Group>
  );
}

function QrCodeElement({
  el,
  onSelect,
  hoverHandlers,
  dragHandlers,
  draggable,
  nodeOpacity,
  displayText,
  previewMode,
}: PosterElementRendererProps) {
  const [qrImage, setQrImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!previewMode) {
      setQrImage(null);
      return;
    }

    const textToEncode = displayText || "https://trizocommunity.com";
    const qw = el.width ?? 160;

    const qrCode = new QRCodeStyling({
      width: qw * 2, // render at 2x resolution
      height: qw * 2,
      data: textToEncode,
      margin: 0,
      qrOptions: { errorCorrectionLevel: "H" },
      dotsOptions: {
        color: el.fill ?? "#000000",
        type: el.qrDotsStyle ?? "square",
      },
      backgroundOptions: {
        color: "transparent",
      },
      cornersSquareOptions: {
        color: el.stroke ?? el.fill ?? "#000000",
        type: el.qrCornersStyle ?? "square",
      },
      cornersDotOptions: {
        color: el.stroke ?? el.fill ?? "#000000",
        type: el.qrCornersDotStyle ?? "square",
      },
      image: el.qrLogoUrl,
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 5,
        imageSize: 0.4
      },
    });

    qrCode.getRawData("png").then((buffer) => {
      if (!buffer) return;
      const blob = buffer instanceof Blob ? buffer : new Blob([buffer as BlobPart], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const img = new window.Image();
      img.onload = () => {
        setQrImage(img);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }).catch(console.error);
  }, [
    displayText,
    previewMode,
    el.width,
    el.fill,
    el.stroke,
    el.qrDotsStyle,
    el.qrCornersStyle,
    el.qrCornersDotStyle,
    el.qrLogoUrl
  ]);

  const qw = el.width ?? 160;
  const qh = el.height ?? 160;

  if (previewMode && qrImage) {
    return (
      <KonvaImage
        id={el.id}
        image={qrImage}
        x={el.x}
        y={el.y}
        width={qw}
        height={qh}
        rotation={el.rotation ?? 0}
        scaleX={el.scaleX ?? 1}
        scaleY={el.scaleY ?? 1}
        opacity={nodeOpacity}
        draggable={draggable}
        onClick={onSelect}
        onTap={onSelect}
        onMouseEnter={hoverHandlers.onMouseEnter}
        onMouseLeave={hoverHandlers.onMouseLeave}
        onDragStart={dragHandlers.onDragStart}
        onDragMove={dragHandlers.onDragMove}
        onDragEnd={dragHandlers.onDragEnd}
      />
    );
  }

  // Fallback to placeholder when not in preview mode or generating
  return (
    <Group
      id={el.id}
      x={el.x}
      y={el.y}
      rotation={el.rotation ?? 0}
      scaleX={el.scaleX ?? 1}
      scaleY={el.scaleY ?? 1}
      opacity={nodeOpacity}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      {...hoverHandlers}
      onDragStart={dragHandlers.onDragStart}
      onDragMove={dragHandlers.onDragMove}
      onDragEnd={dragHandlers.onDragEnd}
    >
      <Rect
        width={qw}
        height={qh}
        fill={el.fill ?? EDITOR_COLORS.white}
        stroke={el.stroke ?? EDITOR_COLORS.mutedForeground}
        strokeWidth={el.strokeWidth ?? 2}
        dash={[8, 6]}
        onClick={onSelect}
        onTap={onSelect}
        {...hoverHandlers}
      />
      <Text
        y={qh / 2 - 10}
        width={qw}
        align="center"
        text={previewMode ? "QR" : "QR CODE"}
        fontSize={14}
        fill={EDITOR_COLORS.mutedForeground}
        listening={false}
      />
    </Group>
  );
}

export function PosterElementRenderer(props: PosterElementRendererProps) {
  const {
    el,
    draggable,
    nodeOpacity,
    displayText,
    onSelect,
    onDblClick,
    hoverHandlers,
    dragHandlers,
  } = props;

  if (el.type === "text") {
    const fontSize = el.fontSize ?? 24;
    const textWidth =
      el.width ?? estimateTextWidth(getEditableText(el), fontSize);
    const deco = el.textDecoration ?? "";
    const shadow = konvaShadowProps(el);
    return (
      <Group
        key={el.id}
        id={el.id}
        x={el.x}
        y={el.y}
        scaleX={el.scaleX ?? 1}
        scaleY={el.scaleY ?? 1}
        opacity={nodeOpacity}
        draggable={draggable}
        rotation={el.rotation ?? 0}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={onDblClick}
        onDblTap={onDblClick}
        {...hoverHandlers}
        onDragStart={dragHandlers.onDragStart}
        onDragMove={dragHandlers.onDragMove}
        onDragEnd={dragHandlers.onDragEnd}
      >
        <Text
          text={displayText}
          fontSize={fontSize}
          fontFamily={el.fontFamily}
          fontStyle={el.fontStyle}
          fill={el.fill ?? EDITOR_COLORS.foreground}
          align={el.align ?? "left"}
          width={textWidth}
          lineHeight={el.lineHeight ?? 1.2}
          letterSpacing={el.letterSpacing ?? 0}
          wrap="word"
          listening
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={onDblClick}
          onDblTap={onDblClick}
          {...hoverHandlers}
          {...shadow}
        />
        {deco.includes("underline") && (
          <Line
            points={[0, fontSize + 4, textWidth, fontSize + 4]}
            stroke={el.fill ?? EDITOR_COLORS.foreground}
            strokeWidth={2}
            listening={false}
          />
        )}
        {deco.includes("line-through") && (
          <Line
            points={[0, fontSize * 0.55, textWidth, fontSize * 0.55]}
            stroke={el.fill ?? EDITOR_COLORS.foreground}
            strokeWidth={2}
            listening={false}
          />
        )}
      </Group>
    );
  }

  if (el.type === "rect") {
    return (
      <Rect
        key={el.id}
        id={el.id}
        x={el.x}
        y={el.y}
        width={el.width ?? 100}
        height={el.height ?? 80}
        cornerRadius={el.cornerRadius ?? 0}
        fill={el.fill}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        opacity={nodeOpacity}
        scaleX={el.scaleX ?? 1}
        scaleY={el.scaleY ?? 1}
        rotation={el.rotation ?? 0}
        {...konvaShadowProps(el)}
        draggable={draggable}
        onClick={onSelect}
        onTap={onSelect}
        {...hoverHandlers}
        onDragStart={dragHandlers.onDragStart}
        onDragMove={dragHandlers.onDragMove}
        onDragEnd={dragHandlers.onDragEnd}
      />
    );
  }

  if (el.type === "circle") {
    return (
      <Circle
        key={el.id}
        id={el.id}
        x={el.x}
        y={el.y}
        radius={el.radius ?? 50}
        fill={el.fill}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        opacity={nodeOpacity}
        rotation={el.rotation ?? 0}
        scaleX={el.scaleX ?? 1}
        scaleY={el.scaleY ?? 1}
        draggable={draggable}
        onClick={onSelect}
        onTap={onSelect}
        {...hoverHandlers}
        onDragStart={dragHandlers.onDragStart}
        onDragMove={dragHandlers.onDragMove}
        onDragEnd={dragHandlers.onDragEnd}
      />
    );
  }

  if (el.type === "triangle") {
    return (
      <RegularPolygon
        key={el.id}
        id={el.id}
        x={el.x}
        y={el.y}
        sides={3}
        radius={el.radius ?? 60}
        fill={el.fill}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        opacity={nodeOpacity}
        rotation={el.rotation ?? 0}
        scaleX={el.scaleX ?? 1}
        scaleY={el.scaleY ?? 1}
        draggable={draggable}
        onClick={onSelect}
        onTap={onSelect}
        {...hoverHandlers}
        onDragStart={dragHandlers.onDragStart}
        onDragMove={dragHandlers.onDragMove}
        onDragEnd={dragHandlers.onDragEnd}
      />
    );
  }

  if (el.type === "line") {
    return (
      <Line
        key={el.id}
        id={el.id}
        x={el.x}
        y={el.y}
        points={el.points ?? [0, 0, 200, 0]}
        stroke={el.stroke ?? "#0f172a"}
        strokeWidth={el.strokeWidth ?? 4}
        opacity={nodeOpacity}
        rotation={el.rotation ?? 0}
        scaleX={el.scaleX ?? 1}
        scaleY={el.scaleY ?? 1}
        draggable={draggable}
        onClick={onSelect}
        onTap={onSelect}
        {...hoverHandlers}
        onDragStart={dragHandlers.onDragStart}
        onDragMove={dragHandlers.onDragMove}
        onDragEnd={dragHandlers.onDragEnd}
      />
    );
  }

  if (el.type === "qr") {
    return <QrCodeElement key={el.id} {...props} />;
  }

  if (el.type === "image") {
    return <ImageElement key={el.id} {...props} />;
  }

  return null;
}
