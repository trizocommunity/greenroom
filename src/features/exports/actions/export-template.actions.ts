"use server";

import { eq } from "drizzle-orm";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { serverNowMs } from "@/core/datetime/server";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import * as ExportRepo from "@/features/exports/repositories/export.repository";
import { exportConfigSchema } from "@/features/exports/schemas/export-config.schema";
import {
  resolveBadgePayload,
  resolveCertificatePayload,
  type TemplateExportPayload,
} from "@/features/exports/services/template-payload.service";
import * as PosterTemplateRepo from "@/features/posters/repositories/poster-template.repository";

export interface ExportTemplateOption {
  id: string;
  code: string;
  type: string;
  name: string;
  width: number;
  height: number;
}

/** Published templates a festival can render badges / certificates from. */
export async function listExportTemplatesAction(
  festivalId: string,
  kind: "BADGE" | "CERTIFICATE",
): Promise<ActionResponse<ExportTemplateOption[]>> {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, festivalId);
    const all = await PosterTemplateRepo.listByFestival(festivalId);
    const published = all.filter((t) => t.status === "PUBLISHED");
    const filtered =
      kind === "BADGE"
        ? published.filter((t) => t.type === "CANDIDATE_CARD")
        : published.filter((t) => t.type === "CERTIFICATE");
    return {
      success: true,
      data: filtered.map((t) => ({
        id: t.id,
        code: t.code,
        type: t.type,
        name: t.konvaJson.templateName ?? t.code,
        width: t.width,
        height: t.height,
      })),
    };
  } catch (error) {
    return handleActionError(error);
  }
}

/** Resolve the template document + per-item bindings for a PROCESSING job. */
export async function getTemplateExportPayloadAction(
  festivalId: string,
  exportId: string,
): Promise<ActionResponse<TemplateExportPayload>> {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, festivalId);

    const row = await ExportRepo.getExportById(exportId, festivalId);
    if (!row) throw new AppError(ERROR_MESSAGES.DEFAULT);

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, festivalId),
      columns: { name: true },
    });
    const festivalName = festival?.name ?? "";

    const config = exportConfigSchema.parse(row.config);
    if (config.type === "BADGE") {
      return {
        success: true,
        data: await resolveBadgePayload(festivalId, config, festivalName),
      };
    }
    if (config.type === "CERTIFICATE") {
      return {
        success: true,
        data: await resolveCertificatePayload(festivalId, config, festivalName),
      };
    }
    throw new AppError("This export is not a template export.");
  } catch (error) {
    return handleActionError(error);
  }
}

/** Store the client-rendered PDF and mark the job COMPLETED. */
export async function finalizeTemplateExportAction(
  festivalId: string,
  exportId: string,
  input: { fileBase64: string; itemCount: number },
): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, festivalId);

    const row = await ExportRepo.getExportById(exportId, festivalId);
    if (!row) throw new AppError(ERROR_MESSAGES.DEFAULT);
    if (row.status !== "PROCESSING") {
      return { success: true, data: { id: exportId } };
    }

    const bytes = Buffer.from(input.fileBase64, "base64");
    const queuedAtMs = Date.parse(row.queuedAt);
    const completedInMs = Number.isNaN(queuedAtMs)
      ? 0
      : Math.max(0, serverNowMs() - queuedAtMs);

    await ExportRepo.completeExport({
      id: exportId,
      fileData: input.fileBase64,
      fileName: `${row.type.toLowerCase()}.pdf`,
      mimeType: "application/pdf",
      fileSizeBytes: bytes.byteLength,
      itemCount: input.itemCount,
      completedInMs,
    });
    return { success: true, data: { id: exportId } };
  } catch (error) {
    return handleActionError(error);
  }
}

/** Mark a template job FAILED (client render error). */
export async function failTemplateExportAction(
  festivalId: string,
  exportId: string,
  message: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, festivalId);
    await ExportRepo.failExport(exportId, message);
    return { success: true, data: { id: exportId } };
  } catch (error) {
    return handleActionError(error);
  }
}
