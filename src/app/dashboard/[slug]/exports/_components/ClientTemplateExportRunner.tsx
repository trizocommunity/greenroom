"use client";

import { useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";
import type Konva from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import { queryKeys } from "@/api/client/_query-keys";
import { PosterExportCanvas } from "@/components/festival/posters/PosterExportCanvas";
import {
  type ExportTemplateOption,
  failTemplateExportAction,
  finalizeTemplateExportAction,
  getTemplateExportPayloadAction,
} from "@/features/exports/actions/export-template.actions";
import type { TemplateExportPayload } from "@/features/exports/services/template-payload.service";
import type { ExportListItem } from "@/features/exports/types/export.types";

interface Props {
  festivalId: string;
  exports: ExportListItem[];
  onProgress?: (exportId: string, current: number, total: number) => void;
}

const QUALITY_RATIO: Record<TemplateExportPayload["quality"], number> = {
  SCREEN: 1,
  STANDARD: 2,
  PRINT: 3,
};

const TEMPLATE_TYPES = new Set(["BADGE", "CERTIFICATE"]);

const PAGE_SIZES: Record<string, { w: number; h: number }> = {
  A3: { w: 842, h: 1191 },
  A4: { w: 595, h: 842 },
  A5: { w: 420, h: 595 },
  LETTER: { w: 612, h: 792 },
  LEGAL: { w: 612, h: 1008 },
};

function initPdf(payload: TemplateExportPayload) {
  const { pageSize, pageOrientation } = payload;
  const base = PAGE_SIZES[pageSize] ?? PAGE_SIZES.A4;
  const isLandscape = pageOrientation === "LANDSCAPE";
  const pageW = isLandscape ? base.h : base.w;
  const pageH = isLandscape ? base.w : base.h;
  const orientation = isLandscape ? "landscape" : "portrait";
  const doc = new jsPDF({ unit: "px", format: [pageW, pageH], orientation });
  return { doc, pageW, pageH, orientation };
}

function appendToPdf(
  doc: jsPDF,
  imgBase64: string,
  index: number,
  payload: TemplateExportPayload,
  pageContext: { pageW: number; pageH: number; orientation: "landscape" | "portrait" }
) {
  const { width, height, printLayout } = payload;
  const { pageW, pageH, orientation } = pageContext;

  if (printLayout === "ONE_PER_PAGE") {
    if (index > 0) doc.addPage([pageW, pageH], orientation);
    const scale = Math.min(pageW / width, pageH / height);
    const renderW = width * scale;
    const renderH = height * scale;
    const x = (pageW - renderW) / 2;
    const y = (pageH - renderH) / 2;
    doc.addImage(imgBase64, "PNG", x, y, renderW, renderH);
    return;
  }

  // MULTIPLE_PER_PAGE
  const itemAspect = height / width;
  const cols = Math.max(1, Math.floor(pageW / width));
  const cellW = pageW / cols;
  const cellH = cellW * itemAspect;
  const rows = Math.max(1, Math.floor(pageH / cellH));
  const perPage = cols * rows;

  const marginX = (pageW - cols * cellW) / 2;
  const marginY = (pageH - rows * cellH) / 2;

  const slot = index % perPage;
  if (index > 0 && slot === 0) doc.addPage([pageW, pageH], orientation);
  
  const col = slot % cols;
  const row = Math.floor(slot / cols);
  const x = marginX + col * cellW;
  const y = marginY + row * cellH;
  doc.addImage(imgBase64, "PNG", x, y, cellW, cellH);
}

interface Job {
  exportId: string;
  payload: TemplateExportPayload;
  index: number;
}

export function ClientTemplateExportRunner({ festivalId, exports, onProgress }: Props) {
  const qc = useQueryClient();
  const stageRef = useRef<Konva.Stage | null>(null);
  const handled = useRef<Set<string>>(new Set());
  const [job, setJob] = useState<Job | null>(null);
  const busy = useRef(false);
  const pdfRef = useRef<{ doc: jsPDF; pageW: number; pageH: number; orientation: "landscape" | "portrait" } | null>(null);

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
        TEMPLATE_TYPES.has(e.type) &&
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
        await failTemplateExportAction(festivalId, next.id, "No items matched the selected filters.");
        busy.current = false;
        invalidate();
        return;
      }
      pdfRef.current = initPdf(res.data);
      setJob({ exportId: next.id, payload: res.data, index: 0 });
      onProgress?.(next.id, 0, res.data.items.length);
    })();
  }, [exports, job, festivalId, invalidate, onProgress]);

  // Capture the currently-rendered item, then advance or finalize.
  useEffect(() => {
    if (!job || !pdfRef.current) return;
    let cancelled = false;

    (async () => {
      // Deterministic wait: wait for all fonts and Konva images to be fully loaded
      if (document.fonts?.ready) await document.fonts.ready;
      
      const stage = stageRef.current;
      if (!stage) return;
      
      // Wait for any images inside the stage to complete loading
      await new Promise<void>((resolve) => {
        const checkImages = () => {
          const imageNodes = stage.find("Image");
          const isLoading = imageNodes.some((node: any) => {
            const img = node.image();
            return img && !img.complete;
          });
          if (!isLoading) resolve();
          else setTimeout(checkImages, 50);
        };
        checkImages();
      });

      if (cancelled) return;

      const dataUrl = stage.toDataURL({
        pixelRatio: QUALITY_RATIO[job.payload.quality],
        mimeType: "image/png",
      });
      
      // Stream immediately to jsPDF to keep memory low
      appendToPdf(pdfRef.current.doc, dataUrl, job.index, job.payload, pdfRef.current);

      if (job.index + 1 < job.payload.items.length) {
        setJob({ ...job, index: job.index + 1 });
        onProgress?.(job.exportId, job.index + 1, job.payload.items.length);
        return;
      }

      // All items captured — extract Blob and upload via FormData (avoids huge JSON payloads)
      try {
        const blob = pdfRef.current.doc.output("blob");
        const formData = new FormData();
        formData.append("file", blob, "export.pdf");
        formData.append("itemCount", String(job.payload.items.length));
        
        await finalizeTemplateExportAction(festivalId, job.exportId, formData);
      } catch (err) {
        await failTemplateExportAction(
          festivalId,
          job.exportId,
          err instanceof Error ? err.message : "Rendering failed.",
        );
      } finally {
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
