"use server";

import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { handleActionError } from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import * as ExportRepo from "@/features/exports/repositories/export.repository";
import {
  type ExportConfig,
  exportConfigSchema,
} from "@/features/exports/schemas/export-config.schema";
import { createAndRunExport } from "@/features/exports/services/export-orchestrator.service";
import { buildExportSummary } from "@/features/exports/services/summary.service";
import type {
  ExportFormat,
  ExportListItem,
} from "@/features/exports/types/export.types";

function toListItem(row: ExportRepo.ExportRowMeta): ExportListItem {
  const parsed = exportConfigSchema.safeParse(row.config);
  const badges = parsed.success ? buildExportSummary(parsed.data).badges : [];
  return {
    id: row.id,
    type: row.type,
    format: row.format,
    status: row.status,
    summary: row.summary,
    filterBadges: badges,
    fileName: row.fileName,
    fileSizeBytes: row.fileSizeBytes,
    itemCount: row.itemCount,
    errorMessage: row.errorMessage,
    queuedAt: row.queuedAt,
    completedAt: row.completedAt,
    completedInMs: row.completedInMs,
    expiresAt: row.expiresAt,
  };
}

export async function listExportsAction(
  festivalId: string,
): Promise<ActionResponse<ExportListItem[]>> {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, festivalId);
    const rows = await ExportRepo.listExportsByFestival(festivalId);
    return { success: true, data: rows.map(toListItem) };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createExportAction(
  festivalId: string,
  input: { format: ExportFormat; config: ExportConfig },
): Promise<ActionResponse<{ id: string; status: string }>> {
  try {
    const session = await getSession();
    // Exports are pure reads — allowed on read-only (PAST/EXPIRED) festivals,
    // so we do NOT pass requireWritable here.
    await assertFestivalAccess(session, festivalId);

    const config = exportConfigSchema.parse(input.config);
    const result = await createAndRunExport({
      festivalId,
      userId: session!.userId,
      format: input.format,
      config,
    });
    return { success: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteExportAction(
  festivalId: string,
  id: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, festivalId);
    await ExportRepo.deleteExport(id, festivalId);
    return { success: true, data: { id } };
  } catch (error) {
    return handleActionError(error);
  }
}
