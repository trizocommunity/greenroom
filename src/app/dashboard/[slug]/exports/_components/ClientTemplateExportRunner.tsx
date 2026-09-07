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

/** Page sizes in points (1 pt = 1/72 in), which is jsPDF's native "px" unit. */
const PAGE_SIZES: Record<string, { w: number; h: number }> = {
  A3: { w: 842, h: 1191 },
  A4: { w: 595, h: 842 },
  A5: { w: 420, h: 595 },
  LETTER: { w: 612, h: 792 },
  LEGAL: { w: 612, h: 1008 },
};

async function assemblePdf(images: string[], payload: TemplateExportPayload): Promise<string> {
  const { width, height, printLayout, pageSize, pageOrientation } = payload;

  // Resolve page dimensions, applying orientation swap.
  const base = PAGE_SIZES[pageSize] ?? PAGE_SIZES.A4;
  const isLandscape = pageOrientation === "LANDSCAPE";
  const pageW = isLandscape ? base.h : base.w;
  const pageH = isLandscape ? base.w : base.h;
  const orientation = isLandscape ? "landscape" : "portrait";

  const getBase64FromDoc = async (doc: jsPDF): Promise<string> => {
    const blob = doc.output("blob");
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return dataUrl.split(",")[1];
  };

  if (printLayout === "ONE_PER_PAGE") {
    // Center the item on the chosen page.
    const doc = new jsPDF({ unit: "px", format: [pageW, pageH], orientation });
    images.forEach((img, i) => {
      if (i > 0) doc.addPage([pageW, pageH], orientation);
      const scale = Math.min(pageW / width, pageH / height);
      const renderW = width * scale;
      const renderH = height * scale;
      const x = (pageW - renderW) / 2;
      const y = (pageH - renderH) / 2;
      doc.addImage(img, "PNG", x, y, renderW, renderH);
    });
    return getBase64FromDoc(doc);
  }

  // MULTIPLE_PER_PAGE — gapless edge-to-edge tiling.
  // Compute how many items fit across and down at native size, zero spacing.
  const itemAspect = height / width;
  const cols = Math.max(1, Math.floor(pageW / width));
  const cellW = pageW / cols;
  const cellH = cellW * itemAspect;
  const rows = Math.max(1, Math.floor(pageH / cellH));
  const perPage = cols * rows;

  // Center the grid on the page: leftover space becomes outer margin.
  const marginX = (pageW - cols * cellW) / 2;
  const marginY = (pageH - rows * cellH) / 2;

  const doc = new jsPDF({
    unit: "px",
    format: [pageW, pageH],
    orientation,
  });

  images.forEach((img, i) => {
    const slot = i % perPage;
    if (i > 0 && slot === 0) doc.addPage([pageW, pageH], orientation);
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const x = marginX + col * cellW;
    const y = marginY + row * cellH;
    doc.addImage(img, "PNG", x, y, cellW, cellH);
  });
  return getBase64FromDoc(doc);
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
        const base64 = await assemblePdf(images, job.payload);
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
