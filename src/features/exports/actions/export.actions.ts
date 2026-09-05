"use server";

import { format } from "date-fns";
import { and, eq, isNotNull, or } from "drizzle-orm";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  programmeReportingSession,
  scheduleEntry,
} from "@/core/database/schema";
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

export async function getScheduleExportDatesAction(festivalId: string): Promise<
  ActionResponse<{
    scheduledDayKeys: string[];
    reportingDayKeys: string[];
  }>
> {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, festivalId);

    // 1. Scheduled entries
    const entries = await db.query.scheduleEntry.findMany({
      where: eq(scheduleEntry.festivalId, festivalId),
      columns: { startTime: true },
    });

    const scheduledDayKeys = new Set<string>();
    for (const e of entries) {
      if (e.startTime) {
        scheduledDayKeys.add(format(new Date(e.startTime), "yyyy-MM-dd"));
      }
    }

    // 2. Reporting sessions for unscheduled programmes
    const reportingSessions = await db.query.programmeReportingSession.findMany(
      {
        where: and(
          eq(programmeReportingSession.festivalId, festivalId),
          or(
            eq(programmeReportingSession.status, "IN_PROGRESS"),
            eq(programmeReportingSession.status, "COMPLETED"),
            eq(programmeReportingSession.status, "CLOSED"),
            isNotNull(programmeReportingSession.startedAt),
          ),
        ),
        columns: { startedAt: true, createdAt: true },
      },
    );

    const reportingDayKeys = new Set<string>();
    for (const rs of reportingSessions) {
      const d = rs.startedAt || rs.createdAt;
      if (d) {
        reportingDayKeys.add(format(new Date(d), "yyyy-MM-dd"));
      }
    }

    return {
      success: true,
      data: {
        scheduledDayKeys: Array.from(scheduledDayKeys),
        reportingDayKeys: Array.from(reportingDayKeys),
      },
    };
  } catch (error) {
    return handleActionError(error);
  }
}
