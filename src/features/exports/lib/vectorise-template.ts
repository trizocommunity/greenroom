import PDFDocument from "pdfkit";
import QRCodeStyling from "qr-code-styling";
import { applyTextCase } from "@/components/editor/editor-utils";
import type {
  EditorBackground,
  EditorElement,
  PosterEditorDocument,
} from "@/components/editor/poster-editor-types";
import { imageCache } from "@/components/editor/poster-image-loader";
import {
  resolveBindingText,
  type PosterBindings,
} from "@/features/posters/services/poster-bindings.service";
import {
  parseMultiGrid,
  autoMultiGrid,
  type TemplateExportPayload,
} from "./multi-grid";

/**
 * Dev-only vector export path using PDFKit. Walks the bound template's
 * elements and emits PDFKit primitives (text, rect, circle, line, SVG path)
 * directly into the PDF so they render at infinite resolution regardless of
 * `MAX_PIXEL_RATIO` or the JPEG/PNG codec.
 *
 * Why PDFKit over jsPDF for the vector path:
 *  - `doc.path(svgString)` parses SVG path data natively — the QR's corner
 *    markers come out as true vector paths, not per-module rects.
 *  - `doc.translate/rotate/scale/save/restore` give a clean affine stack,
 *    replacing the manual matrix-juggling in the jsPDF path.
 *  - `doc.opacity(n)` and `doc.image(buffer, …, {cover:true})` cut the
 *    boilerplate around per-element state.
 *  - Native gradient/image/text support with proper Z-order.
 *
 * Bitmap-only nodes (`image`, QR logos, gradient/image backgrounds, rounded
 * rects) still ship as rasters — PDFKit has no native equivalent for those.
 *
 * Activated by `NEXT_PUBLIC_EXPORT_VECTOR=1` in dev. Prod stays on the raster
 * path because the Vercel Hobby blob cap (`MAX_BLOB_BYTES`) is the binding
 * constraint there.
 */

interface Placement {
  originX: number;
  originY: number;
  scale: number;
  itemW: number;
  itemH: number;
  addPage: boolean;
  cellCol: number;
  cellRow: number;
  perPage: number;
  cellW: number;
  cellH: number;
  margin: number;
  gutter: number;
}

function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

function resolveMultiGridForPayload(
  multiGrid: TemplateExportPayload["multiGrid"],
  pageW: number,
  pageH: number,
  docW: number,
  docH: number,
): { cols: number; rows: number } {
  const explicit = parseMultiGrid(multiGrid);
  if (explicit) return explicit;
  return autoMultiGrid(pageW, pageH, docW, docH);
}

function computePlacement(
  payload: TemplateExportPayload,
  index: number,
  pageW: number,
  pageH: number,
): Placement {
  const margin = mmToPt(payload.marginMm);
  const gutter = mmToPt(payload.gutterMm);
  const { width: docW, height: docH } = payload;

  if (payload.printLayout === "ONE_PER_PAGE") {
    let itemW: number;
    let itemH: number;
    let originX: number;
    let originY: number;
    if (payload.fit === "FILL") {
      itemW = pageW;
      itemH = pageH;
      originX = 0;
      originY = 0;
    } else {
      const availW = pageW - 2 * margin;
      const availH = pageH - 2 * margin;
      const scale = Math.min(availW / docW, availH / docH);
      itemW = docW * scale;
      itemH = docH * scale;
      originX = margin + (availW - itemW) / 2;
      originY = margin + (availH - itemH) / 2;
    }
    return {
      originX,
      originY,
      scale: itemW / docW,
      itemW,
      itemH,
      addPage: index > 0,
      cellCol: 0,
      cellRow: 0,
      perPage: 1,
      cellW: itemW,
      cellH: itemH,
      margin,
      gutter,
    };
  }

  const { cols, rows } = resolveMultiGridForPayload(
    payload.multiGrid,
    pageW,
    pageH,
    docW,
    docH,
  );
  const availW = pageW - 2 * margin;
  const availH = pageH - 2 * margin;
  const cellW = (availW - (cols - 1) * gutter) / cols;
  const cellH = (availH - (rows - 1) * gutter) / rows;

  let itemW: number;
  let itemH: number;
  if (payload.fit === "FILL") {
    itemW = cellW;
    itemH = cellH;
  } else {
    const s = Math.min(cellW / docW, cellH / docH);
    itemW = docW * s;
    itemH = docH * s;
  }

  const perPage = cols * rows;
  const slot = index % perPage;
  const cellCol = slot % cols;
  const cellRow = Math.floor(slot / cols);
  const originX = margin + cellCol * (cellW + gutter) + (cellW - itemW) / 2;
  const originY = margin + cellRow * (cellH + gutter) + (cellH - itemH) / 2;

  return {
    originX,
    originY,
    scale: itemW / docW,
    itemW,
    itemH,
    addPage: index > 0 && slot === 0,
    cellCol,
    cellRow,
    perPage,
    cellW,
    cellH,
    margin,
    gutter,
  };
}

function parseHexColor(
  input: string | undefined,
): [number, number, number] | null {
  if (!input) return null;
  const s = input.trim();
  if (!s.startsWith("#")) return null;
  let h = s.slice(1);
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return [r, g, b];
}

function pdfkitColor(input: string | undefined): string | null {
  const rgb = parseHexColor(input);
  if (!rgb) return null;
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function pdfkitFontFamily(family: string | undefined): string {
  if (!family) return "Helvetica";
  const f = family.toLowerCase();
  if (f.includes("courier") || f.includes("mono")) return "Courier";
  if (f.includes("times") || f.includes("serif") || f.includes("georgia"))
    return "Times-Roman";
  return "Helvetica";
}

function pdfkitFontStyle(family: string, style: string | undefined): string {
  const isBold = (style ?? "").toLowerCase().includes("bold");
  const isItalic = (style ?? "").toLowerCase().includes("italic");
  if (family === "Courier") {
    if (isBold && isItalic) return "Courier-BoldOblique";
    if (isBold) return "Courier-Bold";
    if (isItalic) return "Courier-Oblique";
    return "Courier";
  }
  if (family === "Times-Roman") {
    if (isBold && isItalic) return "Times-BoldItalic";
    if (isBold) return "Times-Bold";
    if (isItalic) return "Times-Italic";
    return "Times-Roman";
  }
  if (isBold && isItalic) return "Helvetica-BoldOblique";
  if (isBold) return "Helvetica-Bold";
  if (isItalic) return "Helvetica-Oblique";
  return "Helvetica";
}

function resolveDisplayText(
  el: EditorElement,
  bindings: PosterBindings,
): string {
  const raw = resolveBindingText(el.bindingKey, bindings, el.text ?? "");
  return applyTextCase(raw, el.textCase);
}

/** Apply element transform using PDFKit's affine stack (translate / rotate
 *  / scale). Opacity via doc.opacity(). Saves graphics state on entry and
 *  restores on exit so siblings don't bleed state. */
function withElementTransform(
  pdf: PDFKit.PDFDocument,
  p: Placement,
  el: EditorElement,
  fn: () => void,
) {
  pdf.save();
  pdf.translate(p.originX + el.x * p.scale, p.originY + el.y * p.scale);
  if (el.rotation) pdf.rotate(el.rotation);
  if (el.scaleX !== undefined || el.scaleY !== undefined) {
    pdf.scale(el.scaleX ?? 1, el.scaleY ?? 1);
  }
  if (el.opacity !== undefined && el.opacity < 1) {
    pdf.opacity(el.opacity);
  }
  fn();
  pdf.restore();
}

function drawRect(pdf: PDFKit.PDFDocument, el: EditorElement, p: Placement) {
  withElementTransform(pdf, p, el, () => {
    const w = (el.width ?? 100) * p.scale;
    const h = (el.height ?? 80) * p.scale;
    const fill = pdfkitColor(el.fill);
    const stroke = pdfkitColor(el.stroke);
    const r = (el.cornerRadius ?? 0) * p.scale;
    if (r > 0) {
      const rr = Math.min(r, w / 2, h / 2);
      const d = [
        `M ${rr} 0`,
        `L ${w - rr} 0`,
        `Q ${w} 0 ${w} ${rr}`,
        `L ${w} ${h - rr}`,
        `Q ${w} ${h} ${w - rr} ${h}`,
        `L ${rr} ${h}`,
        `Q 0 ${h} 0 ${h - rr}`,
        `L 0 ${rr}`,
        `Q 0 0 ${rr} 0`,
        "Z",
      ].join(" ");
      pdf.path(d);
      if (fill) pdf.fillColor(fill).fill();
      if (stroke) {
        pdf.strokeColor(stroke);
        if (el.strokeWidth) pdf.lineWidth(el.strokeWidth * p.scale);
        pdf.stroke();
      }
      return;
    }
    if (fill) pdf.fillColor(fill).rect(0, 0, w, h).fill();
    else if (stroke) {
      pdf.rect(0, 0, w, h);
      pdf.strokeColor(stroke);
      if (el.strokeWidth) pdf.lineWidth(el.strokeWidth * p.scale);
      pdf.stroke();
    }
  });
}

function drawCircle(pdf: PDFKit.PDFDocument, el: EditorElement, p: Placement) {
  withElementTransform(pdf, p, el, () => {
    const r = (el.radius ?? 50) * p.scale;
    const fill = pdfkitColor(el.fill);
    const stroke = pdfkitColor(el.stroke);
    if (fill) pdf.fillColor(fill).circle(0, 0, r).fill();
    else if (stroke) {
      pdf.circle(0, 0, r);
      pdf.strokeColor(stroke);
      if (el.strokeWidth) pdf.lineWidth(el.strokeWidth * p.scale);
      pdf.stroke();
    }
  });
}

function drawTriangle(
  pdf: PDFKit.PDFDocument,
  el: EditorElement,
  p: Placement,
) {
  withElementTransform(pdf, p, el, () => {
    const r = (el.radius ?? 60) * p.scale;
    const ax = 0;
    const ay = -r;
    const bx = r * Math.sin((Math.PI * 2) / 3);
    const by = -r * Math.cos((Math.PI * 2) / 3);
    const cx = -r * Math.sin((Math.PI * 2) / 3);
    const cy = -r * Math.cos((Math.PI * 2) / 3);
    const fill = pdfkitColor(el.fill);
    const stroke = pdfkitColor(el.stroke);
    pdf.moveTo(ax, ay).lineTo(bx, by).lineTo(cx, cy).closePath();
    if (fill) pdf.fillColor(fill).fill();
    if (stroke) {
      pdf.strokeColor(stroke);
      if (el.strokeWidth) pdf.lineWidth(el.strokeWidth * p.scale);
      pdf.stroke();
    }
  });
}

function drawLine(pdf: PDFKit.PDFDocument, el: EditorElement, p: Placement) {
  withElementTransform(pdf, p, el, () => {
    const pts = el.points ?? [0, 0, 200, 0];
    const stroke = pdfkitColor(el.stroke) ?? "black";
    pdf.strokeColor(stroke);
    if (el.strokeWidth) pdf.lineWidth(el.strokeWidth * p.scale);
    pdf.moveTo(pts[0] * p.scale, pts[1] * p.scale);
    for (let i = 2; i < pts.length; i += 2) {
      pdf.lineTo(pts[i] * p.scale, pts[i + 1] * p.scale);
    }
    pdf.stroke();
  });
}

function drawText(
  pdf: PDFKit.PDFDocument,
  el: EditorElement,
  p: Placement,
  bindings: PosterBindings,
) {
  const display = resolveDisplayText(el, bindings);
  withElementTransform(pdf, p, el, () => {
    const fontSize = (el.fontSize ?? 24) * p.scale;
    const textWidth = (el.width ?? fontSize * 4) * p.scale;
    const family = pdfkitFontFamily(el.fontFamily);
    const style = pdfkitFontStyle(family, el.fontStyle);
    pdf.font(style).fontSize(fontSize);
    // Default text fill is pure black so unset `fill` produces readable
    // output across both PDF and the .ai (PDF-wrapper) export paths.
    const fill = pdfkitColor(el.fill) ?? "#000000";
    pdf.fillColor(fill);
    const lineHeight = el.lineHeight ?? 1.2;
    const align = el.align ?? "left";
    pdf.text(display, 0, fontSize, {
      width: textWidth,
      align,
      lineGap: (lineHeight - 1) * fontSize,
    });

    const deco = el.textDecoration ?? "";
    if (deco.includes("underline") || deco.includes("line-through")) {
      const totalHeight = pdf.heightOfString(display, { width: textWidth });
      const lineCount = Math.max(
        1,
        Math.ceil(totalHeight / (fontSize * lineHeight)),
      );
      const decoColor = pdfkitColor(el.fill) ?? "black";
      pdf.strokeColor(decoColor).lineWidth(Math.max(0.5, fontSize * 0.06));
      for (let i = 0; i < lineCount; i++) {
        const y = fontSize + i * fontSize * lineHeight;
        if (deco.includes("underline")) {
          pdf
            .moveTo(0, fontSize + 4 * p.scale)
            .lineTo(textWidth, fontSize + 4 * p.scale)
            .stroke();
        }
        if (deco.includes("line-through")) {
          pdf
            .moveTo(0, y - fontSize * 0.45)
            .lineTo(textWidth, y - fontSize * 0.45)
            .stroke();
        }
      }
    }
  });
}

async function drawRaster(
  pdf: PDFKit.PDFDocument,
  el: EditorElement,
  p: Placement,
  url: string | undefined,
) {
  if (!url) return;
  const cached = imageCache.get(url);
  if (!cached?.complete || cached.naturalWidth === 0) return;
  const canvas = document.createElement("canvas");
  canvas.width = cached.naturalWidth;
  canvas.height = cached.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(cached, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");
  const bytes = dataUrlToBytes(dataUrl);
  withElementTransform(pdf, p, el, () => {
    const w = (el.width ?? 100) * p.scale;
    const h = (el.height ?? 80) * p.scale;
    pdf.image(bytes, 0, 0, { width: w, height: h });
  });
}

async function drawQr(
  pdf: PDFKit.PDFDocument,
  el: EditorElement,
  p: Placement,
  bindings: PosterBindings,
) {
  if (typeof document === "undefined") return;
  // QR value stability: must be byte-identical across pages in the same
  // export, and must not drift while/after the export runs. We source
  // the value from `bindings.qrCode` — the snapshot the server resolved
  // in `buildCandidateCardBindings` and shipped to the client — and only
  // fall back to `resolveBindingText(...)` when the binding key isn't
  // `qrCode` (e.g. an element author renamed the key). The QR pattern is
  // baked into the PDFKit document at the moment of export — it never
  // changes afterward unless the user manually edits the file.
  const payload =
    bindings.qrCode ??
    (el.bindingKey && el.bindingKey !== "qrCode"
      ? resolveBindingText(el.bindingKey, bindings, el.text ?? "")
      : "") ??
    "";
  if (!payload) return;
  const qr = new QRCodeStyling({
    width: 1024,
    height: 1024,
    data: payload,
    margin: 0,
    qrOptions: { errorCorrectionLevel: "H" },
    dotsOptions: {
      color: el.fill ?? "#000000",
      type: el.qrDotsStyle ?? "square",
    },
    backgroundOptions: { color: "transparent" },
    cornersSquareOptions: {
      color: el.stroke ?? el.fill ?? "#000000",
      type: el.qrCornersStyle ?? "square",
    },
    cornersDotOptions: {
      color: el.stroke ?? el.fill ?? "#000000",
      type: el.qrCornersDotStyle ?? "square",
    },
    image: el.qrLogoUrl,
    imageOptions: { crossOrigin: "anonymous", margin: 5, imageSize: 0.4 },
  });
  const raw = await qr.getRawData("svg").catch(() => null);
  if (!raw) return;
  const svgString =
    typeof raw === "string"
      ? raw
      : raw instanceof Blob
        ? await raw.text()
        : String(raw);

  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  const svgEl = svgDoc.documentElement;
  const viewBox = (svgEl.getAttribute("viewBox") ?? "0 0 1024 1024")
    .split(/\s+/)
    .map(Number);
  if (viewBox.length !== 4 || !Number.isFinite(viewBox[2])) return;
  const vbW = viewBox[2];
  const vbH = viewBox[3];

  const qrW = (el.width ?? 160) * p.scale;
  const qrH = (el.height ?? 160) * p.scale;
  const sx = qrW / vbW;
  const sy = qrH / vbH;

  const allShapes = Array.from(svgEl.querySelectorAll("rect, path"));
  const moduleShapes = allShapes.filter((shape) => {
    if (shape.tagName.toLowerCase() === "rect") {
      const w = parseFloat(shape.getAttribute("width") ?? "0");
      const h = parseFloat(shape.getAttribute("height") ?? "0");
      if (w >= vbW - 1 && h >= vbH - 1) return false;
      const href =
        shape.getAttribute("href") ?? shape.getAttribute("xlink:href") ?? "";
      if (href.startsWith("data:image") || href.startsWith("http"))
        return false;
    }
    return true;
  });

  withElementTransform(pdf, p, el, () => {
    pdf.save();
    pdf.scale(sx, sy);
    for (const shape of moduleShapes) {
      const fill = pdfkitColor(shape.getAttribute("fill") ?? undefined);
      if (fill) pdf.fillColor(fill);
      const tag = shape.tagName.toLowerCase();
      if (tag === "rect") {
        const x = parseFloat(shape.getAttribute("x") ?? "0");
        const y = parseFloat(shape.getAttribute("y") ?? "0");
        const w = parseFloat(shape.getAttribute("width") ?? "0");
        const h = parseFloat(shape.getAttribute("height") ?? "0");
        pdf.rect(x, y, w, h).fill();
      } else if (tag === "path") {
        const d = shape.getAttribute("d") ?? "";
        pdf.path(d).fill("even-odd");
      }
    }
    pdf.restore();
  });
}

async function drawBackground(
  pdf: PDFKit.PDFDocument,
  bg: EditorBackground,
  p: Placement,
  docW: number,
  docH: number,
) {
  if (bg.type === "solid") {
    pdf.save();
    const fill = pdfkitColor(bg.color);
    if (fill) pdf.fillColor(fill);
    pdf.rect(0, 0, pdf.page.width, pdf.page.height).fill();
    pdf.restore();
    return;
  }

  if (typeof document === "undefined") return;
  const maxPixels = 8_000_000;
  const targetPixels = docW * docH;
  const dpr = Math.min(2, Math.sqrt(maxPixels / targetPixels));
  const safeDpr = Math.max(1, dpr);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(docW * safeDpr));
  canvas.height = Math.max(1, Math.round(docH * safeDpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(safeDpr, safeDpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (bg.type === "gradient") {
    const g = ctx.createLinearGradient(0, 0, docW, docH);
    g.addColorStop(0, bg.gradientFrom ?? "#111");
    g.addColorStop(1, bg.gradientTo ?? "#333");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, docW, docH);
  } else if (bg.type === "image" && bg.imageUrl) {
    const cached = imageCache.get(bg.imageUrl);
    if (cached?.complete && cached.naturalWidth > 0) {
      const iw = cached.naturalWidth;
      const ih = cached.naturalHeight;
      const sCover = Math.max(docW / iw, docH / ih);
      const drawW = iw * sCover;
      const drawH = ih * sCover;
      ctx.drawImage(
        cached,
        (docW - drawW) / 2,
        (docH - drawH) / 2,
        drawW,
        drawH,
      );
    } else {
      ctx.fillStyle = bg.color || "#ffffff";
      ctx.fillRect(0, 0, docW, docH);
    }
  }
  const dataUrl = canvas.toDataURL("image/png");
  const bytes = dataUrlToBytes(dataUrl);
  pdf.image(bytes, p.originX, p.originY, {
    width: p.itemW,
    height: p.itemH,
  });
}

/** Decode a base64 data URL into a Buffer for PDFKit's `doc.image()`. */
function dataUrlToBytes(dataUrl: string): Buffer {
  const base64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return Buffer.from(bytes);
}

export interface VectorPdfHandle {
  doc: PDFKit.PDFDocument;
  finalize: () => Promise<Blob>;
}

/** Create a fresh PDFKit document for a vector export. The runner holds the
 *  returned doc across items, calling `vectoriseItemToPdf` per page, then
 *  calls `finalize()` once at the end to flush and collect bytes. */
export function createVectorPdfDoc(
  pageW: number,
  pageH: number,
  title: string,
): VectorPdfHandle {
  const chunks: Uint8Array[] = [];
  const doc = new PDFDocument({
    size: [pageW, pageH],
    margin: 0,
    info: { Title: title },
    bufferPages: true,
  });
  doc.on("data", (c: Uint8Array) => chunks.push(c));
  const finalize = () =>
    new Promise<Blob>((resolve) => {
      doc.on("end", () =>
        resolve(new Blob(chunks as BlobPart[], { type: "application/pdf" })),
      );
      doc.end();
    });
  return { doc, finalize };
}

/** Append a single rendered item (page or grid cell) to an existing vector
 *  PDFKit doc. Mirrors the raster path's per-item contract so the runner can
 *  stay agnostic to which library is doing the drawing. */
export async function vectoriseItemToPdf(
  payload: TemplateExportPayload,
  index: number,
  boundDoc: PosterEditorDocument,
  bindings: PosterBindings,
  pageW: number,
  pageH: number,
  pdfDoc: PDFKit.PDFDocument,
): Promise<void> {
  if (index === 0 && typeof console !== "undefined") {
    console.info(
      "[gr-vector] rendering item 0 (PDFKit vector mode active; text + shapes + QR modules → true vector, backgrounds + raster images → PNG)",
    );
  }
  const p = computePlacement(payload, index, pageW, pageH);
  if (p.addPage) {
    pdfDoc.addPage({ size: [pageW, pageH], margin: 0 });
  }

  await drawBackground(
    pdfDoc,
    boundDoc.background,
    p,
    payload.width,
    payload.height,
  );

  const sorted = [...boundDoc.elements]
    .filter((e) => e.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const el of sorted) {
    switch (el.type) {
      case "text":
        drawText(pdfDoc, el, p, bindings);
        break;
      case "rect":
        drawRect(pdfDoc, el, p);
        break;
      case "circle":
        drawCircle(pdfDoc, el, p);
        break;
      case "triangle":
        drawTriangle(pdfDoc, el, p);
        break;
      case "line":
        drawLine(pdfDoc, el, p);
        break;
      case "image":
        await drawRaster(pdfDoc, el, p, el.imageUrl);
        break;
      case "qr":
        await drawQr(pdfDoc, el, p, bindings);
        break;
      default:
        break;
    }
  }
}

/**
 * Build the full export as a single PDFKit document, returning the
 * resulting Blob. Used when the runner needs the whole PDF at once
 * (e.g. ZIP with both PDF and AI). For incremental per-item rendering
 * with progress reporting, the runner still calls `vectoriseItemToPdf`
 * in its existing useEffect loop and then finalises via `finalize()` on
 * the handle from `createVectorPdfDoc`.
 */
export async function buildFullTemplatePdf(
  payload: TemplateExportPayload,
  boundDocs: PosterEditorDocument[],
  pageW: number,
  pageH: number,
): Promise<Blob> {
  const handle = createVectorPdfDoc(
    pageW,
    pageH,
    payload.doc.templateName ?? "Export",
  );
  for (let i = 0; i < payload.items.length; i++) {
    const itemBindings = payload.items[i]?.bindings ?? {};
    const boundDoc = boundDocs[i] ?? payload.doc;
    await vectoriseItemToPdf(
      payload,
      i,
      boundDoc,
      itemBindings,
      pageW,
      pageH,
      handle.doc,
    );
  }
  return handle.finalize();
}
