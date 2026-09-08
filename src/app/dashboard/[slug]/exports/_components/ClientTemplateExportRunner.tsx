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
  autoMultiGrid,
  parseMultiGrid,
  type TemplateExportPayload,
} from "@/features/exports/lib/multi-grid";
import { buildZip } from "@/features/exports/lib/zip";
import { isTemplateExport } from "@/features/exports/schemas/export-config.schema";
import type { ExportListItem } from "@/features/exports/types/export.types";

interface Props {
  festivalId: string;
  exports: ExportListItem[];
  onProgress?: (exportId: string, current: number, total: number) => void;
}

// Quality tiers map to a *target printed DPI*, not a fixed pixelRatio. The
// on-paper DPI is dictated by the page dimensions (jsPDF "px" ≈ 72 DPI), so
// a fixed pixelRatio would either over-rasterise small pages or — as before
// — leave a 300 DPI export indistinguishable from a 96 DPI one. We compute
// the source raster per (doc, page, target) so SCREEN/STANDARD/PRINT have
// a real effect. PNG transparency isn't needed on paper, so all tiers ship
// JPEG.
const TARGET_DPI: Record<TemplateExportPayload["quality"], number> = {
  SCREEN: 150,
  STANDARD: 240,
  PRINT: 300,
};

// Hard upper bound so a 300 DPI export of a giant template on Letter paper
// can't OOM the renderer. ~16× source pixels is plenty for print sharpness.
const MAX_PIXEL_RATIO = 8;

const JPEG_QUALITY: Record<TemplateExportPayload["quality"], number> = {
  SCREEN: 0.88,
  STANDARD: 0.94,
  PRINT: 0.98,
};

// Hard upper bound on the final PDF size the client will upload. Above this,
// the export is auto-marked FAILED with an actionable message instead of
// hitting the proxy body cap and surfacing "Unexpected end of form".
// 100 MB covers ~150 items at PRINT 300 DPI on solid backgrounds.
const MAX_BLOB_BYTES = 100 * 1024 * 1024;

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
  const doc = new jsPDF({ unit: "px", format: [pageW, pageH], orientation });
  return { doc, pageW, pageH, orientation };
}

/** Convert millimetres to jsPDF "px" (≈ 1/72 inch). */
function mmToPx(mm: number): number {
  return (mm * 72) / 25.4;
}

/**
 * Resolve the effective cols × rows for a MULTIPLE_PER_PAGE export. Honors
 * an explicit "COLSxROWS" preset; falls back to the orientation-driven
 * heuristic when the user picks "AUTO".
 */
function resolveMultiGrid(
  multiGrid: TemplateExportPayload["multiGrid"],
  pageW: number,
  pageH: number,
  docW?: number,
  docH?: number,
): { cols: number; rows: number } {
  const explicit = parseMultiGrid(multiGrid);
  if (explicit) return explicit;
  return autoMultiGrid(pageW, pageH, docW, docH);
}

/**
 * Compute the source `pixelRatio` so each item lands at `targetDpi` on paper.
 *
 * Derivation: a jsPDF stage at unit "px" prints at ≈ 72 DPI. After fitting,
 * an item on paper occupies `cellW` px (in inches: cellW / 72). The source
 * raster is `docW × pixelRatio` px. Printed DPI = pixelRatio × docW / cellIn.
 * Solving for the bound: pixelRatio = targetDpi × cellIn / docW. We take the
 * max across both axes and both axes layouts (ONE_PER_PAGE and MULTIPLE)
 * since both must hit DPI, then cap.
 */
function computePixelRatio(
  docW: number,
  docH: number,
  pageW: number,
  pageH: number,
  printLayout: TemplateExportPayload["printLayout"],
  fit: TemplateExportPayload["fit"],
  multiGrid: TemplateExportPayload["multiGrid"],
  targetDpi: number,
): number {
  let cellW: number;
  let cellH: number;
  if (printLayout === "ONE_PER_PAGE") {
    if (fit === "FILL") {
      // Cover the entire page edge-to-edge; printed cell is the page itself.
      cellW = pageW;
      cellH = pageH;
    } else {
      // FIT: contain within page, aspect preserved.
      const s = Math.min(pageW / docW, pageH / docH);
      cellW = docW * s;
      cellH = docH * s;
    }
  } else {
    // Must match appendToPdf's MULTIPLE_PER_PAGE resolution so the raster
    // targets the actual placed cell size.
    const { cols, rows } = resolveMultiGrid(
      multiGrid,
      pageW,
      pageH,
      docW,
      docH,
    );
    cellW = (pageW - 2 * mmToPx(3)) / cols;
    cellH = (pageH - 2 * mmToPx(3)) / rows;
  }
  const cellWIn = cellW / 72;
  const cellHIn = cellH / 72;
  const needW = (targetDpi * cellWIn) / docW;
  const needH = (targetDpi * cellHIn) / docH;
  return Math.min(MAX_PIXEL_RATIO, Math.max(1, Math.max(needW, needH)));
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
  if ("convertToBlob" in canvas) {
    const blob = await (canvas as unknown as OffscreenCanvas).convertToBlob({
      type: "image/jpeg",
      quality,
    });
    return await blobToDataUrl(blob);
  }
  return (canvas as HTMLCanvasElement).toDataURL("image/jpeg", quality);
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
  const margin = mmToPx(marginMm);
  const gutter = mmToPx(gutterMm);

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
  const len = mmToPx(5); // 5 mm tick
  const w = 0.5; // px stroke
  const inset = mmToPx(3); // tick sits this far inside the trim
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
  const len = mmToPx(3);
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
  const pdfRef = useRef<{
    doc: jsPDF;
    pageW: number;
    pageH: number;
    orientation: "landscape" | "portrait";
  } | null>(null);

  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: queryKeys.exports.all(festivalId) }),
    [qc, festivalId],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: one-shot mount/unmount trace; the runner state lives in refs and the effects below.
  useEffect(() => {
    console.info("[gr-debug][exports][runner][mount]", {
      festivalId,
      exportsCount: exports.length,
      processingCount: exports.filter((e) => e.status === "PROCESSING").length,
    });
    return () => {
      console.info("[gr-debug][exports][runner][unmount]", {
        festivalId,
        activeJob: handled.current.size,
      });
    };
  }, []);

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
    console.info("[gr-debug][exports][runner][pick]", {
      festivalId,
      exportId: next.id,
      type: next.type,
    });
    (async () => {
      const res = await getTemplateExportPayloadAction(festivalId, next.id);
      if (!res.success) {
        console.error("[gr-debug][exports][runner][pick-failed]", {
          festivalId,
          exportId: next.id,
          error: res.error,
        });
        await failTemplateExportAction(festivalId, next.id, res.error);
        busy.current = false;
        invalidate();
        return;
      }
      if (res.data.items.length === 0) {
        console.warn("[gr-debug][exports][runner][empty]", {
          festivalId,
          exportId: next.id,
        });
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
      pdfRef.current = initPdf(res.data);
      setJob({
        exportId: next.id,
        payload: res.data,
        index: 0,
      });
      console.info("[gr-debug][exports][runner][start]", {
        festivalId,
        exportId: next.id,
        items: res.data.items.length,
        width: res.data.width,
        height: res.data.height,
        pageSize: res.data.pageSize,
        orientation: res.data.pageOrientation,
        layout: res.data.printLayout,
        quality: res.data.quality,
        includeAi: res.data.includeAi,
        targetDpi: TARGET_DPI[res.data.quality],
        pageW: pdfRef.current.pageW,
        pageH: pdfRef.current.pageH,
      });
      onProgress?.(next.id, 0, res.data.items.length);
    })();
  }, [exports, job, festivalId, invalidate, onProgress]);

  // Capture the currently-rendered item, then advance or finalize.
  useEffect(() => {
    const pdfContext = pdfRef.current;
    if (!job || !pdfContext) return;

    let cancelled = false;
    console.info("[gr-debug][exports][runner][render-start]", {
      festivalId,
      exportId: job.exportId,
      index: job.index,
      total: job.payload.items.length,
    });

    (async () => {
      try {
        // Deterministic wait: wait for all fonts and Konva images to be fully loaded
        if (document.fonts?.ready) await document.fonts.ready;

        const stage = await waitForStage(stageRef);
        if (!stage) {
          console.error("[gr-debug][exports][runner][no-stage]", {
            festivalId,
            exportId: job.exportId,
            index: job.index,
          });
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

        // Give React one last moment to mount late elements like QR codes
        await new Promise((r) => setTimeout(r, 100));

        if (cancelled) {
          console.warn("[gr-debug][exports][runner][cancelled-mid]", {
            festivalId,
            exportId: job.exportId,
            index: job.index,
          });
          return;
        }

        const qualityTier = job.payload.quality;
        const targetDpi = TARGET_DPI[qualityTier];
        const pixelRatio = computePixelRatio(
          job.payload.width,
          job.payload.height,
          pdfContext.pageW,
          pdfContext.pageH,
          job.payload.printLayout,
          job.payload.fit,
          job.payload.multiGrid,
          targetDpi,
        );
        let dataUrl = stage.toDataURL({
          pixelRatio,
          mimeType: "image/jpeg",
          quality: JPEG_QUALITY[qualityTier],
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
            const margin = mmToPx(job.payload.marginMm);
            const gutter = mmToPx(job.payload.gutterMm);
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
          );
          if (cropped) dataUrl = cropped;
        }
        const format: "PNG" | "JPEG" = "JPEG";
        console.info("[gr-debug][exports][runner][rendered-item]", {
          festivalId,
          exportId: job.exportId,
          index: job.index,
          format,
          qualityTier,
          targetDpi,
          pixelRatio: Number(pixelRatio.toFixed(3)),
          dataUrlLen: dataUrl.length,
        });

        // Stream immediately to jsPDF to keep memory low
        appendToPdf(
          pdfContext.doc,
          dataUrl,
          job.index,
          job.payload,
          pdfContext,
          format,
        );

        if (job.index + 1 < job.payload.items.length) {
          console.info("[gr-debug][exports][runner][advance]", {
            festivalId,
            exportId: job.exportId,
            from: job.index,
            to: job.index + 1,
            total: job.payload.items.length,
          });
          setJob({ ...job, index: job.index + 1 });
          onProgress?.(job.exportId, job.index + 1, job.payload.items.length);
          return;
        }

        // All items captured — extract Blob and upload via FormData (avoids huge JSON payloads)
        const pdfBlob = pdfContext.doc.output("blob");
        if (pdfBlob.size > MAX_BLOB_BYTES) {
          const mb = Math.round(pdfBlob.size / (1024 * 1024));
          const message = `Export is ${mb} MB which exceeds the ${Math.round(MAX_BLOB_BYTES / (1024 * 1024))} MB limit. Lower the Export Quality or print fewer items per export.`;
          console.error("[gr-debug][exports][runner][blob-too-large]", {
            festivalId,
            exportId: job.exportId,
            bytes: pdfBlob.size,
            max: MAX_BLOB_BYTES,
          });
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
        // The .ai (Adobe Illustrator) bundle pairs the printable PDF with
        // a same-content `.ai` file. Modern Illustrator (CC 2017+) opens
        // PDF-compatible files, so the user can edit the template source
        // and re-save as a native .ai if needed. We bundle both into a
        // single .zip so the user gets one download. The toggle is on
        // the export config (`includeAi`); the format is always PDF.
        const includeAi = job.payload.includeAi;
        const baseName = job.payload.doc.templateName ?? "export";
        const safeBase = baseName
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
        if (includeAi) {
          const zipBytes = buildZip([
            { name: pdfName, data: pdfBytes },
            { name: aiName, data: pdfBytes },
          ]);
          if (zipBytes.byteLength > MAX_BLOB_BYTES) {
            const mb = Math.round(zipBytes.byteLength / (1024 * 1024));
            const message = `Export bundle is ${mb} MB which exceeds the ${Math.round(MAX_BLOB_BYTES / (1024 * 1024))} MB limit. Lower the Export Quality or print fewer items per export.`;
            console.error("[gr-debug][exports][runner][zip-too-large]", {
              festivalId,
              exportId: job.exportId,
              bytes: zipBytes.byteLength,
              max: MAX_BLOB_BYTES,
            });
            await failTemplateExportAction(festivalId, job.exportId, message);
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
          uploadName = `${safeBase}.pdf`;
          uploadMime = "application/pdf";
        }
        const uploadBlob = new Blob([uploadBytes], { type: uploadMime });
        const formData = new FormData();
        formData.append("file", uploadBlob, uploadName);
        formData.append("itemCount", String(job.payload.items.length));
        formData.append("includeAi", includeAi ? "true" : "false");

        console.info("[gr-debug][exports][runner][finalize-sending]", {
          festivalId,
          exportId: job.exportId,
          itemCount: job.payload.items.length,
          bytes: uploadBytes.byteLength,
          includeAi,
          fileName: uploadName,
          mime: uploadMime,
        });
        await finalizeTemplateExportAction(festivalId, job.exportId, formData);
        console.info("[gr-debug][exports][runner][finalize-ok]", {
          festivalId,
          exportId: job.exportId,
        });

        pdfRef.current = null;
        setJob(null);
        busy.current = false;
        invalidate();
      } catch (err) {
        if (cancelled) {
          console.warn("[gr-debug][exports][runner][cancelled-err]", {
            festivalId,
            exportId: job.exportId,
            index: job.index,
          });
          return;
        }
        console.error("[gr-debug][exports][runner][item-failed]", {
          festivalId,
          exportId: job.exportId,
          index: job.index,
          error: err instanceof Error ? err.message : String(err),
        });
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

    return () => {
      cancelled = true;
    };
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
