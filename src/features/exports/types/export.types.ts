import type { InferSelectModel } from "drizzle-orm";
import type { festivalExport } from "@/core/database/schema";

export type ExportType =
  | "CALL_LIST"
  | "RESULTS"
  | "TEAM_RESULT"
  | "JUDGE_LIST"
  | "VALUATION_SHEET"
  | "BADGE"
  | "CERTIFICATE"
  | "SCHEDULE";

export type ExportFormat = "PDF" | "CSV";
export type ExportStatus = "PROCESSING" | "COMPLETED" | "FAILED";

export type FestivalExportRow = InferSelectModel<typeof festivalExport>;

/**
 * Shape returned to the client for the exports table. The heavy `fileData`
 * (base64 bytes) and raw `config` are intentionally omitted — bytes are served
 * only through the download route.
 */
export interface ExportListItem {
  id: string;
  type: ExportType;
  format: ExportFormat;
  status: ExportStatus;
  summary: string;
  filterBadges: string[];
  fileName: string | null;
  fileSizeBytes: number | null;
  itemCount: number | null;
  errorMessage: string | null;
  queuedAt: string;
  completedAt: string | null;
  completedInMs: number | null;
  expiresAt: string;
}

/** Output every generator produces; the orchestrator persists it. */
export interface GeneratedExport {
  /** Raw file bytes. */
  bytes: Buffer;
  fileName: string;
  mimeType: string;
  itemCount: number;
}
