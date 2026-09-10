"use client";

import {
  CheckCircle2,
  Download,
  Loader2,
  RotateCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRelative } from "@/core/datetime";
import { cn } from "@/core/utils/cn";
import type { ExportListItem } from "@/features/exports/types/export.types";
import { toast } from "@/lib/toast";
import { summarizeIssue } from "./export-issues-banner.logic";
import { getExportTypeMeta } from "./export-types";

interface ProgressEntry {
  current: number;
  total: number;
}

interface ExportsTableProps {
  exports: ExportListItem[];
  progressMap?: Record<string, ProgressEntry>;
  onDelete: (id: string) => void;
  deletingId: string | null;
  onRowClick?: (item: ExportListItem) => void;
}

/** Show at most `max` names; collapse the rest into "+N more". */
function NameChips({
  names,
  max = 2,
  variant = "outline",
}: {
  names: string[];
  max?: number;
  variant?: "outline" | "secondary";
}) {
  if (names.length === 0) return null;
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <>
      {shown.map((n) => (
        <Badge key={n} variant={variant} className="font-normal">
          {n}
        </Badge>
      ))}
      {extra > 0 && (
        <Badge variant="secondary" className="font-normal">
          +{extra} more
        </Badge>
      )}
    </>
  );
}

function downloadUrl(id: string): string {
  return `/api/v1/exports/${id}/download`;
}

function saveBlob(blob: Blob, fileName: string | null) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  if (fileName) a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function startDownload(
  id: string,
  fileName: string | null,
  onProgress: (percent: number) => void,
) {
  const res = await fetch(downloadUrl(id));
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }

  const totalHeader = res.headers.get("Content-Length");
  const total = totalHeader ? Number(totalHeader) : 0;

  if (!res.body || !Number.isFinite(total) || total <= 0) {
    const blob = await res.blob();
    saveBlob(blob, fileName);
    return;
  }

  let received = 0;
  const tapped = res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        onProgress(Math.min(99, (received / total) * 100));
        controller.enqueue(chunk);
      },
    }),
  );

  const blob = await new Response(tapped).blob();
  onProgress(100);
  saveBlob(blob, fileName);
}

function CircularProgress({
  percent,
  size = 28,
  strokeWidth = 2.5,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, percent) / 100) * circumference;
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="text-primary"
      aria-hidden="true"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeOpacity={0.2}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-[stroke-dashoffset] duration-150 ease-linear"
      />
    </svg>
  );
}

interface DownloadButtonProps {
  disabled: boolean;
  downloading: boolean;
  downloaded: boolean;
  percent: number;
  fileName: string | null;
  onStart: () => void;
}

function DownloadButton({
  disabled,
  downloading,
  downloaded,
  percent,
  fileName,
  onStart,
}: DownloadButtonProps) {
  // Once the file has been downloaded in this session, switch to the
  // redownload (rotate-cw) icon so the user knows the artifact is local
  // — clicking again just refreshes the bytes from the server.
  const label = downloaded
    ? `Re-download ${fileName ?? "file"}`
    : fileName
      ? `Download ${fileName}`
      : "Download";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 overflow-hidden"
      disabled={disabled || downloading}
      onClick={onStart}
      aria-label={downloading ? `Downloading ${percent}%` : label}
    >
      {downloading ? (
        <>
          <CircularProgress percent={percent} />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold tabular-nums text-primary">
            {Math.round(percent)}
          </span>
        </>
      ) : downloaded ? (
        <RotateCw className="h-4 w-4 text-primary" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </Button>
  );
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return "< 1 second";
  const seconds = Math.round(ms / 1000);
  return `${seconds} second${seconds === 1 ? "" : "s"}`;
}

function relative(iso: string): string {
  return formatRelative(iso);
}

function formatBytes(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function metaLine(itemCount: number | null, bytes: number | null): string {
  const parts: string[] = [];
  if (itemCount !== null)
    parts.push(`${itemCount} item${itemCount === 1 ? "" : "s"}`);
  const size = formatBytes(bytes);
  if (size) parts.push(size);
  return parts.join(" · ");
}

export function ExportsTable({
  exports,
  progressMap = {},
  onDelete,
  deletingId,
  onRowClick,
}: ExportsTableProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 15;

  const [downloads, setDownloads] = useState<Record<string, number>>({});
  const [activeDownload, setActiveDownload] = useState<string | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  const handleStartDownload = useCallback(
    async (id: string, fileName: string | null) => {
      if (activeDownload) return;
      setActiveDownload(id);
      setDownloads((prev) => ({ ...prev, [id]: 0 }));
      try {
        await startDownload(id, fileName, (percent) => {
          setDownloads((prev) => ({ ...prev, [id]: percent }));
        });
        // Mark as downloaded so the icon flips to "re-download" until
        // the page reloads. localStorage would survive reloads but we keep
        // it session-scoped to avoid showing stale "downloaded" state
        // for an export whose bytes the server may have since changed.
        setDownloadedIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      } catch (err) {
        console.error("Export download failed", err);
        toast.error("Download failed. Please try again.");
      } finally {
        setActiveDownload(null);
        setDownloads((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [activeDownload],
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {exports
          .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
          .map((e) => {
            const meta = getExportTypeMeta(e.type);
            const Icon = meta.icon;
            const firstBadge = e.filterBadges[0];
            const extra = e.filterBadges.length - 1;
            const prog = progressMap[e.id];

            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: role="button" + tabIndex makes the card accessible; nested action buttons stop propagation so they don't fire the row click.
              <div
                key={e.id}
                className={cn(
                  "rounded-lg border px-3 py-2 flex flex-col bg-card gap-1.5",
                  onRowClick &&
                    "cursor-pointer transition-colors hover:bg-muted/30",
                )}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(e) : undefined}
                onKeyDown={
                  onRowClick
                    ? (ev) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault();
                          onRowClick(e);
                        }
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap text-sm">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{meta.title}</span>
                    {firstBadge && (
                      <Badge
                        variant="outline"
                        className="font-normal text-[10px] py-0"
                      >
                        {firstBadge}
                      </Badge>
                    )}
                    {extra > 0 && (
                      <Badge
                        variant="secondary"
                        className="font-normal text-[10px] py-0"
                      >
                        +{extra}
                      </Badge>
                    )}
                    {e.selectedTeamNames.length > 0 && (
                      <span className="text-muted-foreground">·</span>
                    )}
                    {e.selectedTeamNames.length > 0 && (
                      <NameChips names={e.selectedTeamNames} max={1} />
                    )}
                    {e.selectedCategoryNames.length > 0 && (
                      <span className="text-muted-foreground">·</span>
                    )}
                    {e.selectedCategoryNames.length > 0 && (
                      <NameChips
                        names={e.selectedCategoryNames}
                        max={1}
                        variant="secondary"
                      />
                    )}
                  </div>
                  <div className="shrink-0">
                    {e.status === "COMPLETED" && (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </Badge>
                    )}
                    {e.status === "PROCESSING" && (
                      <Badge variant="warning" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {prog
                          ? `Processing ${Math.min(99, Math.round((prog.current / prog.total) * 100))}%`
                          : "Processing"}
                      </Badge>
                    )}
                    {e.status === "FAILED" && (
                      <Badge
                        variant="destructive"
                        className="gap-1"
                        title={
                          e.errorMessage
                            ? (summarizeIssue(e.errorMessage) ?? e.errorMessage)
                            : undefined
                        }
                      >
                        <XCircle className="h-3 w-3" />
                        Failed
                      </Badge>
                    )}
                  </div>
                </div>

                {(e.status === "COMPLETED" &&
                  metaLine(e.itemCount, e.fileSizeBytes)) ||
                e.status === "FAILED" ? (
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate">
                      {e.status === "COMPLETED" &&
                        metaLine(e.itemCount, e.fileSizeBytes)}
                      {e.status === "FAILED" && e.errorMessage && (
                        <span
                          className="text-destructive line-clamp-1"
                          title={e.errorMessage}
                        >
                          {summarizeIssue(e.errorMessage) ?? e.errorMessage}
                        </span>
                      )}
                      <span className="ml-2">
                        · Queued {relative(e.queuedAt)}
                      </span>
                    </span>
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: nested action buttons inside a clickable card; we stop propagation so the card's onClick doesn't fire on Download/Delete. */}
                    <div
                      className="flex items-center gap-0.5 shrink-0"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <DownloadButton
                        disabled={e.status !== "COMPLETED"}
                        downloading={activeDownload === e.id}
                        downloaded={downloadedIds.has(e.id)}
                        percent={downloads[e.id] ?? 0}
                        fileName={e.fileName}
                        onStart={() => handleStartDownload(e.id, e.fileName)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={deletingId === e.id}
                        onClick={() => onDelete(e.id)}
                        aria-label="Delete"
                      >
                        {deletingId === e.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
      </div>
      <div className="hidden md:block rounded-lg border overflow-x-auto">
        <Table className="bg-card">
          <TableHeader>
            <TableRow>
              <TableHead>Export Type</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Queued At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exports
              .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
              .map((e) => {
                const meta = getExportTypeMeta(e.type);
                const Icon = meta.icon;
                const firstBadge = e.filterBadges[0];
                const extra = e.filterBadges.length - 1;
                const prog = progressMap[e.id];

                return (
                  <TableRow
                    key={e.id}
                    className={onRowClick ? "cursor-pointer" : undefined}
                    onClick={onRowClick ? () => onRowClick(e) : undefined}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium whitespace-nowrap">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        {meta.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="font-normal text-[10px] py-0"
                        >
                          {meta.title}
                        </Badge>
                        {firstBadge && (
                          <Badge
                            variant="outline"
                            className="font-normal text-[10px] py-0"
                          >
                            {firstBadge}
                          </Badge>
                        )}
                        {extra > 0 && (
                          <Badge
                            variant="secondary"
                            className="font-normal text-[10px] py-0"
                          >
                            +{extra}
                          </Badge>
                        )}
                        {e.selectedTeamNames.length > 0 && (
                          <>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                              Team
                            </span>
                            <NameChips names={e.selectedTeamNames} max={1} />
                          </>
                        )}
                        {e.selectedCategoryNames.length > 0 && (
                          <>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                              Cat
                            </span>
                            <NameChips
                              names={e.selectedCategoryNames}
                              max={1}
                              variant="secondary"
                            />
                          </>
                        )}
                      </div>
                      {e.status === "COMPLETED" &&
                        metaLine(e.itemCount, e.fileSizeBytes) && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {metaLine(e.itemCount, e.fileSizeBytes)}
                          </div>
                        )}
                      {e.status === "FAILED" && e.errorMessage && (
                        <div
                          className="text-xs text-destructive mt-0.5 line-clamp-1"
                          title={e.errorMessage}
                        >
                          {summarizeIssue(e.errorMessage) ?? e.errorMessage}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {e.status === "COMPLETED" && (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed
                        </Badge>
                      )}
                      {e.status === "PROCESSING" && (
                        <Badge variant="warning" className="gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {prog
                            ? `Processing ${Math.min(99, Math.round((prog.current / prog.total) * 100))}%`
                            : "Processing"}
                        </Badge>
                      )}
                      {e.status === "FAILED" && (
                        <Badge
                          variant="destructive"
                          className="gap-1"
                          title={
                            e.errorMessage
                              ? (summarizeIssue(e.errorMessage) ??
                                e.errorMessage)
                              : undefined
                          }
                        >
                          <XCircle className="h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {relative(e.queuedAt)}
                    </TableCell>
                    <TableCell
                      className="whitespace-nowrap text-sm text-muted-foreground"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <DownloadButton
                          disabled={e.status !== "COMPLETED"}
                          downloading={activeDownload === e.id}
                          downloaded={downloadedIds.has(e.id)}
                          percent={downloads[e.id] ?? 0}
                          fileName={e.fileName}
                          onStart={() => handleStartDownload(e.id, e.fileName)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={deletingId === e.id}
                          onClick={() => onDelete(e.id)}
                          aria-label="Delete"
                        >
                          {deletingId === e.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {exports.length > pageSize && (
        <DataTablePagination
          pageIndex={pageIndex}
          pageCount={Math.ceil(exports.length / pageSize)}
          onPageChange={(page) => setPageIndex(page)}
          className="mt-4"
        />
      )}
    </>
  );
}
