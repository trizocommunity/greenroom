import type { EditorElement } from "./poster-editor-types";

export type CanvasAlign =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

export function getElementBounds(el: EditorElement) {
  const w =
    el.width ??
    (el.type === "circle" || el.type === "triangle"
      ? (el.radius ?? 50) * 2
      : el.type === "text"
        ? 200
        : 100);
  const h =
    el.height ??
    (el.type === "circle" || el.type === "triangle"
      ? (el.radius ?? 50) * 2
      : el.type === "text"
        ? (el.fontSize ?? 24) * (el.lineHeight ?? 1.2)
        : 80);
  return { x: el.x, y: el.y, width: w, height: h };
}

/** Axis-aligned union of bounds for a set of elements (canvas coordinates). */
export function getUnionBounds(elements: EditorElement[]) {
  if (elements.length === 0) return null;
  const boxes = elements.map((el) => getElementBounds(el));
  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export type ElementAlign = CanvasAlign;

/** Align selected elements to the bounding box of the selection. */
export function alignElementsToEachOther(
  elements: EditorElement[],
  ids: string[],
  align: ElementAlign,
): Partial<EditorElement>[] {
  const boxes = ids
    .map((id) => {
      const el = elements.find((e) => e.id === id);
      if (!el) return null;
      const { x, y, width, height } = getElementBounds(el);
      return { id, x, y, width, height };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  if (boxes.length === 0) return [];

  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;

  return boxes.map(({ id, x, y, width, height }) => {
    let nx = x;
    let ny = y;
    if (align === "left") nx = left;
    if (align === "center") nx = centerX - width / 2;
    if (align === "right") nx = right - width;
    if (align === "top") ny = top;
    if (align === "middle") ny = centerY - height / 2;
    if (align === "bottom") ny = bottom - height;
    return { id, x: Math.round(nx), y: Math.round(ny) };
  });
}

export function alignElementsToCanvas(
  elements: EditorElement[],
  ids: string[],
  canvasWidth: number,
  canvasHeight: number,
  align: CanvasAlign,
): Partial<EditorElement>[] {
  return ids.map((id) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return { id };
    const { width, height } = getElementBounds(el);
    let x = el.x;
    let y = el.y;
    if (align === "left") x = 0;
    if (align === "center") x = (canvasWidth - width) / 2;
    if (align === "right") x = canvasWidth - width;
    if (align === "top") y = 0;
    if (align === "middle") y = (canvasHeight - height) / 2;
    if (align === "bottom") y = canvasHeight - height;
    return { id, x: Math.round(x), y: Math.round(y) };
  });
}

export function flipElementPatch(
  el: EditorElement,
  axis: "horizontal" | "vertical",
): Partial<EditorElement> {
  if (axis === "horizontal") {
    return { scaleX: (el.scaleX ?? 1) * -1 };
  }
  return { scaleY: (el.scaleY ?? 1) * -1 };
}

export function cloneElementsForClipboard(
  elements: EditorElement[],
  ids: string[],
): EditorElement[] {
  return elements
    .filter((e) => ids.includes(e.id))
    .map((e) => ({ ...e, locked: false }));
}
