"use client";

import { useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";
import type Konva from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import { queryKeys } from "@/api/client/_query-keys";
import { preloadDocImages } from "@/components/editor/poster-image-loader";
import { PosterExportCanvas } from "@/components/festival/posters/PosterExportCanvas";
import {
  type ExportTemplateOption,
  failTemplateExportAction,
  finalizeTemplateExportAction,
  getTemplateExportPayloadAction,
} from "@/features/exports/actions/export-template.actions";
import {
  resolveMultiGrid,
  type TemplateExportPayload,
} from "@/features/exports/lib/multi-grid";
import {
  createVectorPdfDoc,
  vectoriseItemToPdf,
} from "@/features/exports/lib/vectorise-template";
import { buildZip } from "@/features/exports/lib/zip";
import { isTemplateExport } from "@/features/exports/schemas/export-config.schema";
import type { ExportListItem } from "@/features/exports/types/export.types";
import { documentWithBindings } from "@/features/posters/services/poster-bindings.service";

interface Props {
  festivalId: string;
  exports: ExportListItem[];
  onProgress?: (exportId: string, current: number, total: number) => void;
}

// All three quality tiers render at 300 DPI on paper — what print shops
// expect for badges and certificates. No upscale cap: a small template
// that needs 17× upscale to hit 300 DPI gets 17×, even if the raster is
// large. Set NEXT_PUBLIC_EXPORT_DPI_CAP in .env.local if a specific
// template blows the tab memory.
const TARGET_DPI = 300;

// JPEG encoder quality per tier. SCREEN/STANDARD are tuned for size;
// PRINT bumps to 0.98 for max quality while staying JPEG.
const JPEG_QUALITY: Record<TemplateExportPayload["quality"], number> = {
  SCREEN: 0.88,
  STANDARD: 0.94,
  PRINT: 0.98,
};

// Output codec. JPEG for all tiers — PNG transparency isn't needed on paper
// and JPEG compresses the raster path's blobs enough to fit under
// MAX_BLOB_BYTES on Vercel Hobby.
const OUTPUT_FORMAT: "PNG" | "JPEG" = "JPEG";

// Hard upper bound on the final PDF size the client will upload. Above this,
// the export is auto-retried at the next-lower quality (see
// `nextQualityDown`). If SCREEN still exceeds the cap, the export is
// marked FAILED with an actionable message instead of hitting the
// Vercel Hobby edge body limit (~4.5 MB). 4 MiB leaves a small safety
// margin so borderline sizes don't get rejected with a 413.
const MAX_BLOB_BYTES = 4 * 1024 * 1024;

// When outputFormat is "BOTH" the runner ZIPs the PDF and the `.ai`
// (same PDF bytes under a different extension — `.ai` is a PDF wrapper)
// into a single `.zip`. The bundle is therefore ~2× the PDF size, so
// the cap is halved for that path — quality-fallback kicks in earlier
// and exports don't fail at the upload stage (413 on Vercel's edge). A
// 2 MiB PDF → 4 MiB ZIP fits.
const MAX_BLOB_BYTES_INCLUDE_SOURCE = MAX_BLOB_BYTES / 2;

// The Vercel Hobby cap only bites in production. Local `next dev` has no
// edge function in front of the Server Action, so there's no reason to
// reject (or auto-downgrade) exports that would otherwise render fine.
// `NEXT_PUBLIC_EXPORT_GUARD_ENABLED=1` re-enables the guard for local
// smoke-testing of the prod code path.
const SIZE_GUARD_ENABLED =
  process.env.NODE_ENV !== "development" ||
  process.env.NEXT_PUBLIC_EXPORT_GUARD_ENABLED === "1";

// Dev-only vector pass. When enabled the runner walks the template's bound
// elements and emits jsPDF primitives instead of rasterising through Konva,
// so shapes and text render at infinite resolution regardless of DPI / codec.
// Disabled in prod because the raster path has more visual regression coverage
// (same path the QA suite exercises). Opt in locally with
// `NEXT_PUBLIC_EXPORT_VECTOR=1` in `.env.local`.
const VECTOR_MODE_ENABLED =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_EXPORT_VECTOR === "1";

// Quality fallback order when a rendered PDF exceeds MAX_BLOB_BYTES.
// Highest quality first; the runner re-renders at the next entry until
// it fits under the cap (or exhausts the list, at which point it fails).
const QUALITY_FALLBACK: TemplateExportPayload["quality"][] = [
  "PRINT",
  "STANDARD",
  "SCREEN",
];

function nextQualityDown(
  current: TemplateExportPayload["quality"],
): TemplateExportPayload["quality"] | null {
  const idx = QUALITY_FALLBACK.indexOf(current);
  if (idx === -1 || idx === QUALITY_FALLBACK.length - 1) return null;
  return QUALITY_FALLBACK[idx + 1];
}

const PAGE_SIZES: Record<string, { w: number; h: number }> = {
  A3: { w: 842, h: 1191 },
  A4: { w: 595, h: 842 },
  A5: { w: 420, h: 595 },
  LETTER: { w: 612, h: 792 },
  LEGAL: { w: 612, h: 1008 },
  "13X19": { w: 936, h: 1368 },
};

function pageDims(payload: TemplateExportPayload): {
  pageW: number;
  pageH: number;
  orientation: "landscape" | "portrait";
} {
  const base = PAGE_SIZES[payload.pageSize] ?? PAGE_SIZES.A4;
  const isLandscape = payload.pageOrientation === "LANDSCAPE";
  const pageW = isLandscape ? base.h : base.w;
  const pageH = isLandscape ? base.w : base.h;
  return {
    pageW,
    pageH,
    orientation: isLandscape ? "landscape" : "portrait",
  };
}

function initPdf(payload: TemplateExportPayload) {
  const { pageW, pageH, orientation } = pageDims(payload);
  // Unit MUST be "pt": with "px" jsPDF multiplies the format array by
  // ~1.333 (96/72) so a 13×19 page prints at 17.33×25.33 inches. See
  // `scaleFactor` in jsPDF's addPage/beginPage source. We use "pt" so the
  // PAGE_SIZES values land in the PDF mediaBox verbatim as points
  // (1/72 inch). This also matches the meaning of `mmToPt` below — every
  // drawing call (addImage, rect, etc.) now reads its arguments in points.
  const doc = new jsPDF({ unit: "pt", format: [pageW, pageH], orientation });
  return { doc, pageW, pageH, orientation };
}

/** Convert millimetres to PDF points (1/72 inch). Matches the runner's
 * `unit: "pt"` so addImage/rect coordinates land at the intended mm size. */
function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

/**
 * Resolve the effective cols × rows for a MULTIPLE_PER_PAGE export. Lives in
 * `multi-grid.ts` so the filter UI can show the user the actual grid that
 * AUTO will pick — same source of truth as the runner.
 */

/**
 * Compute the source `pixelRatio` so each item lands at `TARGET_DPI` on paper.
 *
 * Derivation: jsPDF's unit is pt (1 pt = 1/72 in). After placement, an item
 * occupies `cellW` pt on the page (cellW / 72 in). The source raster is
 * `docW × pixelRatio` px. Printed DPI = pixelRatio × docW / cellIn.
 * Solving for the bound: pixelRatio = targetDpi × cellIn / docW. We take the
 * max across both axes and both layouts (ONE_PER_PAGE and MULTIPLE) since
 * both must hit DPI. No upscale cap: a tiny template on a large page gets
 * the upscale it needs to hit 300 DPI exactly, even if the raster is large.
 * Set NEXT_PUBLIC_EXPORT_DPI_CAP in .env.local if a specific template
 * blows the tab memory.
 */
function computePixelRatio(
  docW: number,
  docH: number,
  pageW: number,
  pageH: number,
  printLayout: TemplateExportPayload["printLayout"],
  fit: TemplateExportPayload["fit"],
  multiGrid: TemplateExportPayload["multiGrid"],
): number {
  const envCap = process.env.NEXT_PUBLIC_EXPORT_DPI_CAP;
  const cap = envCap ? Number.parseFloat(envCap) : Number.POSITIVE_INFINITY;
  let cellW: number;
  let cellH: number;
  if (printLayout === "ONE_PER_PAGE") {
    if (fit === "FILL") {
      cellW = pageW;
      cellH = pageH;
    } else {
      const s = Math.min(pageW / docW, pageH / docH);
      cellW = docW * s;
      cellH = docH * s;
    }
  } else {
    const { cols, rows } = resolveMultiGrid(
      multiGrid,
      pageW,
      pageH,
      docW,
      docH,
    );
    cellW = (pageW - 2 * mmToPt(3)) / cols;
    cellH = (pageH - 2 * mmToPt(3)) / rows;
  }
  const cellWIn = cellW / 72;
  const cellHIn = cellH / 72;
  const needW = (TARGET_DPI * cellWIn) / docW;
  const needH = (TARGET_DPI * cellHIn) / docH;
  return Math.min(cap, Math.max(1, Math.max(needW, needH)));
}

async function waitForStage(
  stageRef: React.MutableRefObject<Konva.Stage | null>,
): Promise<Konva.Stage | null> {
  for (let i = 0; i < 20; i++) {
    const stage = stageRef.current;
    if (stage) return stage;
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  }
  return stageRef.current;
}

/**
 * Crop a data-URL image to the requested source rect, returning a JPEG
 * data-URL of just that rect. Used by FILL to avoid Konva's missing crop
 * support on toDataURL.
 */
async function cropViaCanvas(
  srcDataUrl: string,
  pixelRatio: number,
  srcX: number,
  srcY: number,
  srcCropW: number,
  srcCropH: number,
  quality = 0.94,
  format: "PNG" | "JPEG" = "JPEG",
): Promise<string | null> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = srcDataUrl;
  });
  const outW = Math.round(srcCropW * pixelRatio);
  const outH = Math.round(srcCropH * pixelRatio);
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? (new OffscreenCanvas(outW, outH) as unknown as HTMLCanvasElement)
      : Object.assign(document.createElement("canvas"), {
          width: outW,
          height: outH,
        });
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    srcX * pixelRatio,
    srcY * pixelRatio,
    srcCropW * pixelRatio,
    srcCropH * pixelRatio,
    0,
    0,
    outW,
    outH,
  );
  const mimeType = format === "PNG" ? "image/png" : "image/jpeg";
  if ("convertToBlob" in canvas) {
    const blob = await (canvas as unknown as OffscreenCanvas).convertToBlob({
      type: mimeType,
      ...(format === "JPEG" ? { quality } : {}),
    });
    return await blobToDataUrl(blob);
  }
  return format === "JPEG"
    ? (canvas as HTMLCanvasElement).toDataURL("image/jpeg", quality)
    : (canvas as HTMLCanvasElement).toDataURL("image/png");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function appendToPdf(
  doc: jsPDF,
  imgBase64: string,
  index: number,
  payload: TemplateExportPayload,
  pageContext: {
    pageW: number;
    pageH: number;
    orientation: "landscape" | "portrait";
  },
  format: "PNG" | "JPEG" = "JPEG",
) {
  const {
    width,
    height,
    printLayout,
    fit,
    multiGrid,
    marginMm,
    gutterMm,
    bleedMm,
    drawCropMarks,
  } = payload;
  const { pageW, pageH, orientation } = pageContext;
  const margin = mmToPt(marginMm);
  const gutter = mmToPt(gutterMm);

  // ── ONE_PER_PAGE ────────────────────────────────────────────────────────
  if (printLayout === "ONE_PER_PAGE") {
    if (index > 0) doc.addPage([pageW, pageH], orientation);

    if (fit === "FILL") {
      // Cover: aspect-preserve, centre-crop the source onto the page. The
      // render effect pre-crops via Konva's clip params on toDataURL so we
      // can place the result at full page size with no further math here.
      doc.addImage(imgBase64, format, 0, 0, pageW, pageH);
    } else {
      // FIT: shrink-to-fit inside margin, centered on page.
      const availW = pageW - 2 * margin;
      const availH = pageH - 2 * margin;
      const scale = Math.min(availW / width, availH / height);
      const renderW = width * scale;
      const renderH = height * scale;
      const tileX = margin + (availW - renderW) / 2;
      const tileY = margin + (availH - renderH) / 2;
      doc.addImage(imgBase64, format, tileX, tileY, renderW, renderH);
    }

    if (drawCropMarks) drawTrimMarks(doc, pageW, pageH, bleedMm);
    return;
  }

  // ── MULTIPLE_PER_PAGE (BADGE only) ─────────────────────────────────────
  // The doc is scaled to fit a sticker-sheet-style grid. Doc aspect is
  // preserved; cell count follows the user-selected `multiGrid` preset, or
  // the orientation-driven heuristic when `multiGrid === "AUTO"`.
  // Items are auto-aligned and centered within each cell.
  const { cols: colsW, rows: colsH } = resolveMultiGrid(
    multiGrid,
    pageW,
    pageH,
    width,
    height,
  );
  const availW = pageW - 2 * margin;
  const availH = pageH - 2 * margin;
  const cellW = (availW - (colsW - 1) * gutter) / colsW;
  const cellH = (availH - (colsH - 1) * gutter) / colsH;

  let itemW: number;
  let itemH: number;
  if (fit === "FILL") {
    itemW = cellW;
    itemH = cellH;
  } else {
    // FIT: scale proportionally to fit inside cell, auto-aligned & centered
    const scale = Math.min(cellW / width, cellH / height);
    itemW = width * scale;
    itemH = height * scale;
  }

  const perPage = colsW * colsH;
  const slot = index % perPage;
  if (index > 0 && slot === 0) doc.addPage([pageW, pageH], orientation);

  const col = slot % colsW;
  const row = Math.floor(slot / colsW);
  const tileX = margin + col * (cellW + gutter) + (cellW - itemW) / 2;
  const tileY = margin + row * (cellH + gutter) + (cellH - itemH) / 2;
  doc.addImage(imgBase64, format, tileX, tileY, itemW, itemH);

  if (drawCropMarks && slot === 0) {
    drawGridTrimMarks(doc, margin, margin, cellW, cellH, gutter, colsW, colsH);
  }
}

/** Draw a single cross at each trim corner for ONE_PER_PAGE. */
function drawTrimMarks(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  _bleedMm: number,
) {
  const len = mmToPt(5); // 5 mm tick
  const w = 0.5; // px stroke
  const inset = mmToPt(3); // tick sits this far inside the trim
  const corners = [
    [inset, inset],
    [pageW - inset, inset],
    [inset, pageH - inset],
    [pageW - inset, pageH - inset],
  ];
  for (const [cx, cy] of corners) {
    doc.setLineWidth(w);
    doc.line(cx - len, cy, cx + len, cy);
    doc.line(cx, cy - len, cx, cy + len);
  }
}

/** Draw trim ticks for each cell in a multi-up grid, honoring cell size and gutter. */
function drawGridTrimMarks(
  doc: jsPDF,
  originX: number,
  originY: number,
  cellW: number,
  cellH: number,
  gutter: number,
  cols: number,
  rows: number,
) {
  const len = mmToPt(3);
  const w = 0.4;
  doc.setLineWidth(w);
  for (let r = 0; r < rows; r++) {
    const yTop = originY + r * (cellH + gutter);
    const yBottom = yTop + cellH;
    for (let c = 0; c < cols; c++) {
      const xLeft = originX + c * (cellW + gutter);
      const xRight = xLeft + cellW;

      // Top-left corner
      doc.line(xLeft - len, yTop, xLeft, yTop);
      doc.line(xLeft, yTop - len, xLeft, yTop);

      // Top-right corner
      doc.line(xRight, yTop, xRight + len, yTop);
      doc.line(xRight, yTop - len, xRight, yTop);

      // Bottom-left corner
      doc.line(xLeft - len, yBottom, xLeft, yBottom);
      doc.line(xLeft, yBottom, xLeft, yBottom + len);

      // Bottom-right corner
      doc.line(xRight, yBottom, xRight + len, yBottom);
      doc.line(xRight, yBottom, xRight, yBottom + len);
    }
  }
}

interface Job {
  exportId: string;
  payload: TemplateExportPayload;
  index: number;
}

export function ClientTemplateExportRunner({
  festivalId,
  exports,
  onProgress,
}: Props) {
  const qc = useQueryClient();
  const stageRef = useRef<Konva.Stage | null>(null);
  const handled = useRef<Set<string>>(new Set());
  const [job, setJob] = useState<Job | null>(null);
  const busy = useRef(false);
  const pdfRef = useRef<
    | {
        kind: "raster";
        doc: jsPDF;
        pageW: number;
        pageH: number;
        orientation: "landscape" | "portrait";
      }
    | {
        kind: "vector";
        doc: PDFKit.PDFDocument;
        finalize: () => Promise<Blob>;
        pageW: number;
        pageH: number;
      }
    | null
  >(null);

  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: queryKeys.exports.all(festivalId) }),
    [qc, festivalId],
  );

  // Tab close warning when processing
  useEffect(() => {
    if (!job) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [job]);

  // Pick up the next unhandled template job.
  useEffect(() => {
    if (job || busy.current) return;
    const next = exports.find(
      (e) =>
        e.status === "PROCESSING" &&
        isTemplateExport(e.type) &&
        !handled.current.has(e.id),
    );
    if (!next) return;

    busy.current = true;
    handled.current.add(next.id);
    (async () => {
      const res = await getTemplateExportPayloadAction(festivalId, next.id);
      if (!res.success) {
        await failTemplateExportAction(festivalId, next.id, res.error);
        busy.current = false;
        invalidate();
        return;
      }
      if (res.data.items.length === 0) {
        await failTemplateExportAction(
          festivalId,
          next.id,
          "No items matched the selected filters.",
        );
        busy.current = false;
        invalidate();
        return;
      }
      await preloadDocImages(res.data.doc);
      const { pageW, pageH } = pageDims(res.data);
      const needsPdfKit =
        VECTOR_MODE_ENABLED &&
        (res.data.outputFormat === "PDF" || res.data.outputFormat === "BOTH");
      pdfRef.current = needsPdfKit
        ? {
            kind: "vector",
            ...createVectorPdfDoc(
              pageW,
              pageH,
              res.data.doc.templateName ?? "Export",
            ),
            pageW,
            pageH,
          }
        : { kind: "raster", ...initPdf(res.data) };
      // The `.ai` slot reuses the PDFKit output (`.ai` is a PDF wrapper),
      // so the raster/PDFKit path serves both `PDF`, `BOTH`, and `AI`
      // outputs.
      setJob({
        exportId: next.id,
        payload: res.data,
        index: 0,
      });
      onProgress?.(next.id, 0, res.data.items.length);
    })();
  }, [exports, job, festivalId, invalidate, onProgress]);

  // Capture the currently-rendered item, then advance or finalize.
  useEffect(() => {
    if (!job) return;
    const pdfContext = pdfRef.current;

    (async () => {
      try {
        // Vector path: skip stage/fonts/QR waits; we emit jsPDF primitives
        // from the bound template directly. Images are preloaded once at
        // job pickup (preloadDocImages above) so the QR / image / bg
        // raster fallbacks have cached HTMLImageElements to draw.
        if (VECTOR_MODE_ENABLED) {
          // `.ai` output no longer takes this branch — the AI format is a
          // PDF wrapper, so it reuses the PDFKit raster bytes below.

          if (!pdfContext || pdfContext.kind !== "vector") return;
          const itemBindings = job.payload.items[job.index]?.bindings ?? {};
          const boundDoc = documentWithBindings(
            job.payload.doc,
            itemBindings,
            true,
          );
          await vectoriseItemToPdf(
            job.payload,
            job.index,
            boundDoc,
            itemBindings,
            pdfContext.pageW,
            pdfContext.pageH,
            pdfContext.doc,
          );

          if (job.index + 1 < job.payload.items.length) {
            setJob({ ...job, index: job.index + 1 });
            onProgress?.(job.exportId, job.index + 1, job.payload.items.length);
            return;
          }

          // All PDFKit items captured. Flush PDF bytes once.
          const pdfBlob = await pdfContext.finalize();
          const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
          const outputFormat = job.payload.outputFormat;
          const baseName = job.payload.doc.templateName ?? "export";
          const safeBase =
            baseName
              .toLowerCase()
              .normalize("NFKD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")
              .slice(0, 48) || "export";
          const pdfName = `${safeBase}.pdf`;
          const aiName = `${safeBase}.ai`;
          let uploadBytes: Uint8Array<ArrayBuffer>;
          let uploadName: string;
          let uploadMime: string;

          if (outputFormat === "BOTH") {
            // The `.ai` format is a PDF wrapper — we re-emit the
            // already-built PDF with the `.ai` filename so Illustrator
            // opens it as a multi-artboard document. Multi-page support
            // comes for free because the PDF path already calls
            // `doc.addPage()` when the slot wraps to 0.
            const zipBytes = buildZip([
              { name: pdfName, data: pdfBytes },
              { name: aiName, data: pdfBytes },
            ]);
            if (
              SIZE_GUARD_ENABLED &&
              zipBytes.byteLength > MAX_BLOB_BYTES_INCLUDE_SOURCE
            ) {
              const mb = Math.round(zipBytes.byteLength / (1024 * 1024));
              const maxSourceMb = Math.round(
                MAX_BLOB_BYTES_INCLUDE_SOURCE / 2 / (1024 * 1024),
              );
              const message = `Export bundle is ${mb} MB (the ZIP contains the PDF and the .ai — both are the same multi-page PDF, just named differently). Lower Export Quality (PRINT → STANDARD → SCREEN) or split the export into smaller batches by category or team.`;
              await failTemplateExportAction(
                festivalId,
                job.exportId,
                message,
              );
              pdfRef.current = null;
              setJob(null);
              busy.current = false;
              invalidate();
              return;
            }
            uploadBytes = zipBytes;
            uploadName = `${safeBase}.zip`;
            uploadMime = "application/zip";
          } else {
            // outputFormat === "PDF"
            uploadBytes = pdfBytes;
            uploadName = pdfName;
            uploadMime = "application/pdf";
          }
          const uploadBlob = new Blob([uploadBytes], { type: uploadMime });
          const formData = new FormData();
          formData.append("file", uploadBlob, uploadName);
          formData.append("itemCount", String(job.payload.items.length));
          formData.append("outputFormat", outputFormat);
          const finalizeRes = await finalizeTemplateExportAction(
            festivalId,
            job.exportId,
            formData,
          );
          if (!finalizeRes?.success) {
            const message =
              finalizeRes && "error" in finalizeRes
                ? String(finalizeRes.error)
                : "Upload failed.";
            await failTemplateExportAction(festivalId, job.exportId, message);
            pdfRef.current = null;
            setJob(null);
            busy.current = false;
            invalidate();
            return;
          }
          pdfRef.current = null;
          setJob(null);
          busy.current = false;
          invalidate();
          return;
        }
        if (document.fonts?.ready) await document.fonts.ready;

        const stage = await waitForStage(stageRef);
        if (!stage) {
          return;
        }

        // Wait for any images inside the stage to complete loading and decoding
        await new Promise<void>((resolve) => {
          let attempts = 0;
          const checkImages = () => {
            attempts++;
            const imageNodes = stage.find("Image");
            const hasExpectedImages =
              (job.payload.doc.elements || []).some(
                (e) =>
                  (e.type === "image" && e.imageUrl) ||
                  (e.type === "qr" && e.qrLogoUrl),
              ) ||
              (job.payload.doc.background?.type === "image" &&
                job.payload.doc.background?.imageUrl);

            if (hasExpectedImages && imageNodes.length === 0 && attempts < 25) {
              setTimeout(checkImages, 50);
              return;
            }

            const isLoading = imageNodes.some((node: any) => {
              const img = node.image();
              return !img || !img.complete || img.naturalWidth === 0;
            });

            if (!isLoading || attempts > 30) resolve();
            else setTimeout(checkImages, 50);
          };
          checkImages();
        });

        // Wait for QR elements. Each `<QrCodeElement>` is async — it calls
        // `QRCodeStyling.getRawData()` inside a useEffect and only swaps
        // its placeholder <Group> for a <KonvaImage> once the raster is
        // ready. Without this wait, the stage captures whatever is in
        // flight and some cards end up showing the "QR" placeholder in
        // the final PDF instead of an actual code.
        await new Promise<void>((resolve) => {
          let attempts = 0;
          const expectedQrIds = new Set(
            (job.payload.doc.elements || [])
              .filter((e) => e.type === "qr")
              .map((e) => e.id),
          );
          if (expectedQrIds.size === 0) {
            resolve();
            return;
          }
          const checkQr = () => {
            attempts++;
            const pending = (
              stage.find((node: any) => {
                if (!node) return false;
                const name = node.name?.();
                if (name !== "qr-element") return false;
                const id = node.id?.();
                return (
                  expectedQrIds.has(id) && node.getClassName?.() === "Group"
                );
              }) as Array<unknown>
            ).length;
            if (pending === 0 || attempts > 60) resolve();
            else setTimeout(checkQr, 50);
          };
          checkQr();
        });

        // Give React one last moment to mount late elements like QR codes
        await new Promise((r) => setTimeout(r, 100));

        if (!pdfContext || pdfContext.kind !== "raster") return;
        const qualityTier = job.payload.quality;
        const pixelRatio = computePixelRatio(
          job.payload.width,
          job.payload.height,
          pdfContext.pageW,
          pdfContext.pageH,
          job.payload.printLayout,
          job.payload.fit,
          job.payload.multiGrid,
        );
        let dataUrl = stage.toDataURL({
          pixelRatio,
          mimeType: OUTPUT_FORMAT === "PNG" ? "image/png" : "image/jpeg",
          ...(OUTPUT_FORMAT === "JPEG"
            ? { quality: JPEG_QUALITY[qualityTier] }
            : {}),
        });
        // For FILL, cover-crop the source before placing so
        // jsPDF never has to upscale or distort. Konva 7/8 don't expose a
        // crop rect on toDataURL here, so we paint through an OffscreenCanvas.
        if (job.payload.fit === "FILL") {
          let targetW = pdfContext.pageW;
          let targetH = pdfContext.pageH;
          if (job.payload.printLayout === "MULTIPLE_PER_PAGE") {
            const { cols, rows } = resolveMultiGrid(
              job.payload.multiGrid,
              pdfContext.pageW,
              pdfContext.pageH,
              job.payload.width,
              job.payload.height,
            );
            const margin = mmToPt(job.payload.marginMm);
            const gutter = mmToPt(job.payload.gutterMm);
            targetW =
              (pdfContext.pageW - 2 * margin - (cols - 1) * gutter) / cols;
            targetH =
              (pdfContext.pageH - 2 * margin - (rows - 1) * gutter) / rows;
          }
          const s = Math.max(
            targetW / job.payload.width,
            targetH / job.payload.height,
          );
          const srcCropW = targetW / s;
          const srcCropH = targetH / s;
          const cropped = await cropViaCanvas(
            dataUrl,
            pixelRatio,
            (job.payload.width - srcCropW) / 2,
            (job.payload.height - srcCropH) / 2,
            srcCropW,
            srcCropH,
            JPEG_QUALITY[qualityTier],
            OUTPUT_FORMAT,
          );
          if (cropped) dataUrl = cropped;
        }
        const format = OUTPUT_FORMAT;

        appendToPdf(
          pdfContext.doc,
          dataUrl,
          job.index,
          job.payload,
          pdfContext,
          format,
        );

        if (job.index + 1 < job.payload.items.length) {
          setJob({ ...job, index: job.index + 1 });
          onProgress?.(job.exportId, job.index + 1, job.payload.items.length);
          return;
        }

        // All items captured — extract Blob and check size. If over the cap,
        // automatically retry at the next-lower quality (PRINT → STANDARD
        // → SCREEN) by re-rendering. If even SCREEN exceeds the cap, fail
        // with an actionable message — user must split into smaller batches.
        // In dev the guard is off (see SIZE_GUARD_ENABLED) so users can
        // exercise the full Server Action path with large files locally.
        const pdfBlob = pdfContext.doc.output("blob");
        if (SIZE_GUARD_ENABLED && pdfBlob.size > MAX_BLOB_BYTES) {
          const nextQuality = nextQualityDown(job.payload.quality);
          if (nextQuality) {
            // Re-render at lower quality. Re-init the PDF context (the
            // existing one already has items appended) and reset index to
            // 0. The render useEffect re-runs because `job` changed.
            pdfRef.current = { kind: "raster", ...initPdf({ ...job.payload, quality: nextQuality }) };
            setJob({
              ...job,
              payload: { ...job.payload, quality: nextQuality },
              index: 0,
            });
            onProgress?.(job.exportId, 0, job.payload.items.length);
            return;
          }
          const mb = Math.round(pdfBlob.size / (1024 * 1024));
          const maxMb = Math.round(MAX_BLOB_BYTES / (1024 * 1024));
          const message = `Export is ${mb} MB which exceeds the ${maxMb} MB Vercel Hobby Server Action body limit even at SCREEN quality. Please split the export into smaller batches by category or team.`;
          await failTemplateExportAction(festivalId, job.exportId, message);
          pdfRef.current = null;
          setJob(null);
          busy.current = false;
          invalidate();
          return;
        }
        const pdfBytes: Uint8Array<ArrayBuffer> = new Uint8Array(
          await pdfBlob.arrayBuffer(),
        );
        // Adobe Illustrator's `.ai` format is a PDF wrapper. The runner
        // always emits PDF bytes — "AI" ships the same PDF with a `.ai`
        // extension, "BOTH" zips it twice under different names so the
        // user gets a printable PDF and a same-content `.ai` Illustrator
        // opens as a multi-artboard PDF.
        const outputFormat = job.payload.outputFormat;
        const baseName = job.payload.doc.templateName ?? "export";
        const safeBase =
          baseName
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 48) || "export";
        const pdfName = `${safeBase}.pdf`;
        const aiName = `${safeBase}.ai`;
        let uploadBytes: Uint8Array<ArrayBuffer>;
        let uploadName: string;
        let uploadMime: string;
        if (outputFormat === "AI") {
          uploadBytes = pdfBytes;
          uploadName = aiName;
          uploadMime = "application/pdf";
        } else if (outputFormat === "BOTH") {
          const zipBytes = buildZip([
            { name: pdfName, data: pdfBytes },
            { name: aiName, data: pdfBytes },
          ]);
          if (
            SIZE_GUARD_ENABLED &&
            zipBytes.byteLength > MAX_BLOB_BYTES_INCLUDE_SOURCE
          ) {
            const nextQuality = nextQualityDown(job.payload.quality);
            if (nextQuality) {
              pdfRef.current = { kind: "raster", ...initPdf({ ...job.payload, quality: nextQuality }) };
              setJob({
                ...job,
                payload: { ...job.payload, quality: nextQuality },
                index: 0,
              });
              onProgress?.(job.exportId, 0, job.payload.items.length);
              return;
            }
            const mb = Math.round(zipBytes.byteLength / (1024 * 1024));
            const maxSourceMb = Math.round(
              MAX_BLOB_BYTES_INCLUDE_SOURCE / 2 / (1024 * 1024),
            );
            const message = `Export bundle is ${mb} MB (the ZIP contains the PDF and the .ai — both are the same multi-page PDF, just named differently). Lower Export Quality (PRINT → STANDARD → SCREEN) or split the export into smaller batches by category or team.`;
            await failTemplateExportAction(
              festivalId,
              job.exportId,
              message,
            );
            pdfRef.current = null;
            setJob(null);
            busy.current = false;
            invalidate();
            return;
          }
          uploadBytes = zipBytes;
          uploadName = `${safeBase}.zip`;
          uploadMime = "application/zip";
        } else {
          uploadBytes = pdfBytes;
          uploadName = pdfName;
          uploadMime = "application/pdf";
        }
        const uploadBlob = new Blob([uploadBytes], { type: uploadMime });
        const formData = new FormData();
        formData.append("file", uploadBlob, uploadName);
        formData.append("itemCount", String(job.payload.items.length));
        formData.append("outputFormat", outputFormat);
        const finalizeRes = await finalizeTemplateExportAction(
          festivalId,
          job.exportId,
          formData,
        );
        if (!finalizeRes?.success) {
          const message =
            finalizeRes && "error" in finalizeRes
              ? String(finalizeRes.error)
              : "Upload failed.";
          await failTemplateExportAction(festivalId, job.exportId, message);
        }
        pdfRef.current = null;
        setJob(null);
        busy.current = false;
        invalidate();
      } catch (err) {
        await failTemplateExportAction(
          festivalId,
          job.exportId,
          err instanceof Error ? err.message : "Rendering failed.",
        );
        pdfRef.current = null;
        setJob(null);
        busy.current = false;
        invalidate();
      }
    })();

    return () => {};
  }, [job, festivalId, invalidate, onProgress]);

  if (!job) return null;
  const item = job.payload.items[job.index];
  if (!item) return null;

  return (
    <PosterExportCanvas
      key={`${job.exportId}-${job.index}`}
      doc={job.payload.doc}
      bindings={item.bindings}
      stageRef={stageRef}
      scale={1}
    />
  );
}

export type { ExportTemplateOption };
