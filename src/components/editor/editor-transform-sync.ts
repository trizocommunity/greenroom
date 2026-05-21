import type Konva from "konva";
import { estimateTextWidth, finiteNumber } from "./editor-utils";
import type { EditorElement } from "./poster-editor-types";
import type { ElementRect } from "./editor-snap-guides";

function resolveRelativeContainer(
  node: Konva.Node,
  relativeTo?: Konva.Node | null,
): Konva.Container | undefined {
  const candidate = relativeTo ?? node.getParent();
  if (candidate && typeof (candidate as Konva.Container).getChildren === "function") {
    return candidate as Konva.Container;
  }
  return undefined;
}

export function rectFromKonvaNode(
  node: Konva.Node,
  /** Defaults to the node's parent (document space inside the artboard group). */
  relativeTo?: Konva.Node | null,
): ElementRect {
  const box = node.getClientRect({
    relativeTo: resolveRelativeContainer(node, relativeTo),
    skipShadow: true,
    skipStroke: true,
  });
  return {
    left: box.x,
    top: box.y,
    right: box.x + box.width,
    bottom: box.y + box.height,
    width: box.width,
    height: box.height,
    centerX: box.x + box.width / 2,
    centerY: box.y + box.height / 2,
  };
}

export function patchFromTransform(
  el: EditorElement,
  node: Konva.Node,
): Partial<EditorElement> {
  const x = finiteNumber(node.x(), el.x);
  const y = finiteNumber(node.y(), el.y);
  const rotation = finiteNumber(node.rotation(), el.rotation ?? 0);
  const scaleX = finiteNumber(node.scaleX(), 1) || 1;
  const scaleY = finiteNumber(node.scaleY(), 1) || 1;

  if (el.type === "text") {
    const fontSize = el.fontSize ?? 24;
    const currentWidth = el.width ?? estimateTextWidth(el.text ?? "", fontSize);
    return {
      x,
      y,
      rotation,
      width: Math.max(48, currentWidth * Math.abs(scaleX)),
      fontSize:
        Math.abs(scaleX - 1) > 0.01 && Math.abs(scaleX - scaleY) < 0.01
          ? Math.max(12, fontSize * Math.abs(scaleX))
          : fontSize,
    };
  }

  if (el.type === "rect" || el.type === "image" || el.type === "qr") {
    return {
      x,
      y,
      rotation,
      width: Math.max(8, (el.width ?? 100) * Math.abs(scaleX)),
      height: Math.max(8, (el.height ?? 80) * Math.abs(scaleY)),
    };
  }

  if (el.type === "circle" || el.type === "triangle") {
    const r = el.radius ?? 50;
    const avg = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
    return {
      x,
      y,
      rotation,
      radius: Math.max(8, r * avg),
    };
  }

  if (el.type === "line") {
    const points = el.points ?? [0, 0, 200, 0];
    const scaled = points.map((p, i) =>
      i % 2 === 0 ? p * scaleX : p * scaleY,
    );
    return { x, y, rotation, points: scaled };
  }

  return { x, y, rotation };
}
