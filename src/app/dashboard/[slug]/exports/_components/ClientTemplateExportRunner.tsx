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
}

const QUALITY_RATIO: Record<TemplateExportPayload["quality"], number> = {
  SCREEN: 1,
  STANDARD: 2,
  PRINT: 3,
};

const TEMPLATE_TYPES = new Set(["BADGE", "CERTIFICATE"]);

/** A4 in px @96dpi for the multi-up grid layout. */
const A4 = { w: 794, h: 1123, margin: 32, gap: 16, cols: 2 };

function assemblePdf(images: string[], payload: TemplateExportPayload): string {
  const { width, height, printLayout } = payload;

  if (printLayout === "ONE_PER_PAGE") {
    const orientation = width >= height ? "landscape" : "portrait";
    const doc = new jsPDF({ unit: "px", format: [width, height], orientation });
    images.forEach((img, i) => {
      if (i > 0) doc.addPage([width, height], orientation);
      doc.addImage(img, "PNG", 0, 0, width, height);
    });
    return doc.output("datauristring").split(",")[1];
  }

  // MULTIPLE_PER_PAGE — grid on A4 portrait.
  const doc = new jsPDF({
    unit: "px",
    format: [A4.w, A4.h],
    orientation: "portrait",
  });
  const cellW = (A4.w - A4.margin * 2 - A4.gap * (A4.cols - 1)) / A4.cols;
  const cellH = cellW * (height / width);
  const rows = Math.max(
    1,
    Math.floor((A4.h - A4.margin * 2 + A4.gap) / (cellH + A4.gap)),
  );
  const perPage = A4.cols * rows;

  images.forEach((img, i) => {
    const slot = i % perPage;
    if (i > 0 && slot === 0) doc.addPage([A4.w, A4.h], "portrait");
    const col = slot % A4.cols;
    const row = Math.floor(slot / A4.cols);
    const x = A4.margin + col * (cellW + A4.gap);
    const y = A4.margin + row * (cellH + A4.gap);
    doc.addImage(img, "PNG", x, y, cellW, cellH);
  });
  return doc.output("datauristring").split(",")[1];
}

interface Job {
  exportId: string;
  payload: TemplateExportPayload;
  index: number;
  images: string[];
}

/**
 * Watches the exports list for PROCESSING badge/certificate jobs, renders each
 * item off-screen with the poster Konva canvas, assembles a PDF, and uploads it
 * to finalize the job. Rendering happens one item at a time.
 */
export function ClientTemplateExportRunner({ festivalId, exports }: Props) {
  const qc = useQueryClient();
  const stageRef = useRef<Konva.Stage | null>(null);
  const handled = useRef<Set<string>>(new Set());
  const [job, setJob] = useState<Job | null>(null);
  const busy = useRef(false);

  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: queryKeys.exports.all(festivalId) }),
    [qc, festivalId],
  );

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
        await failTemplateExportAction(
          festivalId,
          next.id,
          "No items matched the selected filters.",
        );
        busy.current = false;
        invalidate();
        return;
      }
      setJob({ exportId: next.id, payload: res.data, index: 0, images: [] });
    })();
  }, [exports, job, festivalId, invalidate]);

  // Capture the currently-rendered item, then advance or finalize.
  useEffect(() => {
    if (!job) return;
    let cancelled = false;

    (async () => {
      // Give fonts and images a moment to load before capturing.
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 400));
      if (cancelled) return;

      const stage = stageRef.current;
      if (!stage) return;
      const dataUrl = stage.toDataURL({
        pixelRatio: QUALITY_RATIO[job.payload.quality],
        mimeType: "image/png",
      });
      const images = [...job.images, dataUrl];

      if (images.length < job.payload.items.length) {
        setJob({ ...job, index: job.index + 1, images });
        return;
      }

      // All items captured — assemble and upload.
      try {
        const base64 = assemblePdf(images, job.payload);
        await finalizeTemplateExportAction(festivalId, job.exportId, {
          fileBase64: base64,
          itemCount: images.length,
        });
      } catch (err) {
        await failTemplateExportAction(
          festivalId,
          job.exportId,
          err instanceof Error ? err.message : "Rendering failed.",
        );
      } finally {
        setJob(null);
        busy.current = false;
        invalidate();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [job, festivalId, invalidate]);

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
