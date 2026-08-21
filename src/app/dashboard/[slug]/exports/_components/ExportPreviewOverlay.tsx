"use client";

import { Download, ExternalLink, Loader2, X } from "lucide-react";
import { useEffect } from "react";
import { useExportBlob } from "@/api/client/exports";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/core/datetime";
import type { ExportListItem } from "@/features/exports/types/export.types";
import { CsvPreviewViewer } from "./CsvPreviewViewer";
import { getExportTypeMeta } from "./export-types";
import { PdfPreviewViewer } from "./PdfPreviewViewer";

interface Props {
  exportId: string | null;
  exports: ExportListItem[];
  onClose: () => void;
}

export function ExportPreviewOverlay({ exportId, exports, onClose }: Props) {
  const row = exportId ? exports.find((e) => e.id === exportId) : null;
  const open = !!exportId;
  const status = row?.status ?? null;
  const format = row?.format ?? "PDF";
  const meta = row ? getExportTypeMeta(row.type) : null;

  const blob = useExportBlob({
    exportId,
    format,
    enabled: open && status === "COMPLETED",
  });

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !row) return null;

  const subtitle =
    row.completedAt !== null
      ? `Generated ${formatDateTime(row.completedAt, { dateStyle: "medium", timeStyle: "short" })}`
      : row.status === "PROCESSING"
        ? "Generating…"
        : "Preparing";

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${meta?.title ?? "Export"} preview`}
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b px-4 sm:px-6 py-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {meta?.icon && (
            <meta.icon className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">
              {row.fileName ??
                `${meta?.title ?? "Export"}.${format.toLowerCase()}`}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {meta?.title ?? "Export"} · {subtitle}
              {row.itemCount != null && (
                <>
                  {" "}
                  · {row.itemCount} item{row.itemCount === 1 ? "" : "s"}
                </>
              )}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={onClose}
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      {/* Body */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {status === "FAILED" ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div>
              <p className="font-medium text-destructive">Export failed</p>
              {row.errorMessage && (
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  {row.errorMessage}
                </p>
              )}
            </div>
          </div>
        ) : status === "PROCESSING" || blob.isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {status === "PROCESSING"
              ? "Generating your export…"
              : "Loading preview…"}
          </div>
        ) : blob.isError ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-destructive">
            {blob.error?.message ?? "Failed to load preview."}
          </div>
        ) : blob.data ? (
          format === "PDF" ? (
            <PdfPreviewViewer blobUrl={URL.createObjectURL(blob.data)} />
          ) : (
            <CsvPreviewViewer blobUrl={URL.createObjectURL(blob.data)} />
          )
        ) : null}
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-end gap-2 border-t px-4 sm:px-6 py-3 shrink-0 bg-background">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          asChild={false}
          onClick={() => {
            const a = document.createElement("a");
            a.href = `/api/v1/exports/${row.id}/download`;
            if (row.fileName) a.download = row.fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
          }}
          disabled={status !== "COMPLETED"}
        >
          <Download className="h-4 w-4 mr-1.5" />
          Download
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            window.open(
              `/api/v1/exports/${row.id}/download?inline=1`,
              "_blank",
              "noopener",
            );
          }}
          disabled={status !== "COMPLETED"}
        >
          <ExternalLink className="h-4 w-4 mr-1.5" />
          Open in new tab
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </footer>
    </div>
  );
}
