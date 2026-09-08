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

export type ExportFormat = "PDF" | "CSV" | "AI";
export type ExportStatus = "PROCESSING" | "COMPLETED" | "FAILED";

export type FestivalExportRow = InferSelectModel<typeof festivalExport>;

/**
 * Shape returned to the client for the exports table. The heavy `fileData`
 * (base64 bytes) is intentionally omitted — bytes are served only through
 * the download route. `config` is small (a few hundred bytes) and needed
 * by the detail drawer, so it ships inline.
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
  /** Resolved template name for BADGE / CERTIFICATE (null otherwise). */
  templateName: string | null;
  /** Resolved names for the IDs in the config (empty if none selected). */
  selectedTeamNames: string[];
  selectedCategoryNames: string[];
  selectedProgrammeNames: string[];
  selectedStageNames: string[];
  /** Parsed config. Null if the row's jsonb no longer matches the schema. */
  config:
    | import("@/features/exports/schemas/export-config.schema").ExportConfig
    | null;
}

/** Output every generator produces; the orchestrator persists it. */
export interface GeneratedExport {
  /** Raw file bytes. */
  bytes: Buffer;
  fileName: string;
  mimeType: string;
  itemCount: number;
}
