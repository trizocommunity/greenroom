"use client";

import { CheckCircle2, Download, Loader2, Trash2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRelative } from "@/core/datetime";
import type { ExportListItem } from "@/features/exports/types/export.types";
import { getExportTypeMeta } from "./export-types";

interface ExportsTableProps {
  exports: ExportListItem[];
  onDelete: (id: string) => void;
  deletingId: string | null;
}

function downloadUrl(id: string): string {
  return `/api/v1/exports/${id}/download`;
}

function triggerDownload(id: string, fileName: string | null) {
  const a = document.createElement("a");
  a.href = downloadUrl(id);
  if (fileName) a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
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
  onDelete,
  deletingId,
}: ExportsTableProps) {
  // Auto-download a job once it transitions from PROCESSING to COMPLETED
  // within this session (does not re-download pre-existing completed rows).
  const seenProcessing = useRef<Set<string>>(new Set());
  const autoDownloaded = useRef<Set<string>>(new Set());

  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 15;

  useEffect(() => {
    for (const e of exports) {
      if (e.status === "PROCESSING") {
        seenProcessing.current.add(e.id);
      }
      if (
        e.status === "COMPLETED" &&
        seenProcessing.current.has(e.id) &&
        !autoDownloaded.current.has(e.id)
      ) {
        autoDownloaded.current.add(e.id);
        triggerDownload(e.id, e.fileName);
      }
    }
  }, [exports]);

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
          return (
            <div
              key={e.id}
              className="rounded-lg border p-4 flex flex-col bg-card gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 font-medium">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  {meta.title}
                </div>
                <div>
                  {e.status === "COMPLETED" && (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </Badge>
                  )}
                  {e.status === "PROCESSING" && (
                    <Badge variant="warning" className="gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing
                    </Badge>
                  )}
                  {e.status === "FAILED" && (
                    <Badge
                      variant="destructive"
                      className="gap-1"
                      title={e.errorMessage ?? undefined}
                    >
                      <XCircle className="h-3 w-3" />
                      Failed
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm">{e.summary}</span>
                  {firstBadge && (
                    <Badge variant="outline" className="font-normal">
                      {firstBadge}
                    </Badge>
                  )}
                  {extra > 0 && (
                    <Badge variant="secondary" className="font-normal">
                      +{extra}
                    </Badge>
                  )}
                </div>
                {e.status === "COMPLETED" &&
                  metaLine(e.itemCount, e.fileSizeBytes) && (
                    <div className="text-xs text-muted-foreground">
                      {metaLine(e.itemCount, e.fileSizeBytes)}
                    </div>
                  )}
                {e.status === "FAILED" && e.errorMessage && (
                  <div className="text-xs text-destructive line-clamp-2">
                    {e.errorMessage}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 mt-2">
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <span>Queued: {relative(e.queuedAt)}</span>
                  {e.status === "COMPLETED" && e.completedInMs && (
                    <span>Done in: {formatDuration(e.completedInMs)}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={e.status !== "COMPLETED"}
                    onClick={() => triggerDownload(e.id, e.fileName)}
                    aria-label="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
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
              </div>
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
              <TableHead>Completed In</TableHead>
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
              return (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium whitespace-nowrap">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      {meta.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm">{e.summary}</span>
                      {firstBadge && (
                        <Badge variant="outline" className="font-normal">
                          {firstBadge}
                        </Badge>
                      )}
                      {extra > 0 && (
                        <Badge variant="secondary" className="font-normal">
                          +{extra}
                        </Badge>
                      )}
                    </div>
                    {e.status === "COMPLETED" &&
                      metaLine(e.itemCount, e.fileSizeBytes) && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {metaLine(e.itemCount, e.fileSizeBytes)}
                        </div>
                      )}
                    {e.status === "FAILED" && e.errorMessage && (
                      <div className="text-xs text-destructive mt-0.5 line-clamp-1">
                        {e.errorMessage}
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
                        Processing
                      </Badge>
                    )}
                    {e.status === "FAILED" && (
                      <Badge
                        variant="destructive"
                        className="gap-1"
                        title={e.errorMessage ?? undefined}
                      >
                        <XCircle className="h-3 w-3" />
                        Failed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDuration(e.completedInMs)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {relative(e.queuedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={e.status !== "COMPLETED"}
                        onClick={() => triggerDownload(e.id, e.fileName)}
                        aria-label="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
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
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (pageIndex > 0) setPageIndex(p => p - 1);
                }}
                className={pageIndex === 0 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {[...Array(Math.ceil(exports.length / pageSize))].map((_, i) => {
              const targetPage = i;
              const totalPages = Math.ceil(exports.length / pageSize);
              
              if (
                targetPage === 0 ||
                targetPage === totalPages - 1 ||
                (targetPage >= pageIndex - 1 && targetPage <= pageIndex + 1)
              ) {
                return (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      isActive={pageIndex === targetPage}
                      onClick={(e) => {
                        e.preventDefault();
                        setPageIndex(targetPage);
                      }}
                    >
                      {targetPage + 1}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
              
              if (targetPage === pageIndex - 2 || targetPage === pageIndex + 2) {
                return (
                  <PaginationItem key={i}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }
              
              return null;
            })}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if ((pageIndex + 1) * pageSize < exports.length) setPageIndex(p => p + 1);
                }}
                className={(pageIndex + 1) * pageSize >= exports.length ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}
