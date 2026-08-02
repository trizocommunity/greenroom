import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { serverNowMs } from "@/core/datetime/server";
import * as ExportRepo from "@/features/exports/repositories/export.repository";
import {
  type ExportConfig,
  isTemplateExport,
} from "@/features/exports/schemas/export-config.schema";
import { generateCallList } from "@/features/exports/services/generators/call-list.generator";
import { generateJudgeList } from "@/features/exports/services/generators/judge-list.generator";
import { generateResults } from "@/features/exports/services/generators/results.generator";
import { generateTeamResult } from "@/features/exports/services/generators/team-result.generator";
import { generateValuationSheet } from "@/features/exports/services/generators/valuation-sheet.generator";
import { buildExportSummary } from "@/features/exports/services/summary.service";
import type {
  ExportFormat,
  GeneratedExport,
} from "@/features/exports/types/export.types";

export interface CreateExportRequest {
  festivalId: string;
  userId: string;
  format: ExportFormat;
  config: ExportConfig;
}

/**
 * Dispatch a validated config to its generator. Template exports (badge /
 * certificate) are rendered on the client and are not handled here — see
 * ISSUE-12.
 */
async function runGenerator(
  festivalId: string,
  festivalName: string,
  festivalTz: string,
  config: ExportConfig,
  format: ExportFormat,
): Promise<GeneratedExport> {
  switch (config.type) {
    case "TEAM_RESULT":
      return generateTeamResult(festivalId, config, format);
    case "CALL_LIST":
      return generateCallList(
        festivalId,
        config,
        format,
        festivalName,
        festivalTz,
      );
    case "RESULTS":
      return generateResults(
        festivalId,
        config,
        format,
        festivalName,
        festivalTz,
      );
    case "JUDGE_LIST":
      return generateJudgeList(festivalId, config, format, festivalName);
    case "VALUATION_SHEET":
      return generateValuationSheet(festivalId, config, format, festivalName);
    default:
      throw new Error(`Export type "${config.type}" is not implemented yet.`);
  }
}

/**
 * Create the export row, then (for data exports) generate the file inline and
 * finalize the row. Returns the created row id. Generation failures are
 * captured on the row as FAILED rather than thrown, so the UI always shows the
 * job.
 */
export async function createAndRunExport(
  request: CreateExportRequest,
): Promise<{ id: string; status: "COMPLETED" | "FAILED" | "PROCESSING" }> {
  const { summary } = buildExportSummary(request.config);

  const row = await ExportRepo.createExport({
    festivalId: request.festivalId,
    type: request.config.type,
    format: request.format,
    summary,
    config: request.config,
    createdBy: request.userId,
  });

  // Template exports stay PROCESSING; the client renders and finalizes them.
  if (isTemplateExport(request.config.type)) {
    return { id: row.id, status: "PROCESSING" };
  }

  const festivalRow = await db.query.festival.findFirst({
    where: eq(festivalTable.id, request.festivalId),
    columns: { name: true, timezone: true },
  });
  const festivalName = festivalRow?.name ?? "";
  const festivalTz = festivalRow?.timezone ?? "UTC";

  const startedAt = serverNowMs();
  try {
    const generated = await runGenerator(
      request.festivalId,
      festivalName,
      festivalTz,
      request.config,
      request.format,
    );
    await ExportRepo.completeExport({
      id: row.id,
      fileData: generated.bytes.toString("base64"),
      fileName: generated.fileName,
      mimeType: generated.mimeType,
      fileSizeBytes: generated.bytes.byteLength,
      itemCount: generated.itemCount,
      completedInMs: serverNowMs() - startedAt,
    });
    return { id: row.id, status: "COMPLETED" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Export generation failed.";
    await ExportRepo.failExport(row.id, message);
    return { id: row.id, status: "FAILED" };
  }
}
