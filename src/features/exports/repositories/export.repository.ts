import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "@/core/database/client";
import { festivalExport, user as userTable } from "@/core/database/schema";
import { fromNow, serverNowIso } from "@/core/datetime/server";
import type {
  ExportFormat,
  ExportType,
  FestivalExportRow,
} from "@/features/exports/types/export.types";

const RETENTION_DAYS = 2;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export interface CreateExportInput {
  festivalId: string;
  type: ExportType;
  format: ExportFormat;
  summary: string;
  config: unknown;
  createdBy: string;
}

export async function createExport(
  input: CreateExportInput,
): Promise<FestivalExportRow> {
  const queuedAtIso = serverNowIso();
  const expiresAt = fromNow(RETENTION_MS);

  const actorUser = input.createdBy
    ? await db.query.user.findFirst({
        where: eq(userTable.id, input.createdBy),
        columns: { email: true, displayName: true, fullName: true },
      })
    : null;

  const [row] = await db
    .insert(festivalExport)
    .values({
      id: randomUUID(),
      festivalId: input.festivalId,
      type: input.type,
      format: input.format,
      status: "PROCESSING",
      summary: input.summary,
      config: input.config,
      createdBy: input.createdBy,
      createdByName:
        actorUser?.displayName ||
        actorUser?.fullName ||
        actorUser?.email ||
        null,
      createdByEmail: actorUser?.email || null,
      queuedAt: queuedAtIso,
      expiresAt,
    })
    .returning();
  return row;
}

export interface CompleteExportInput {
  id: string;
  fileData: string; // base64
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  itemCount: number;
  completedInMs: number;
}

export async function completeExport(
  input: CompleteExportInput,
): Promise<void> {
  await db
    .update(festivalExport)
    .set({
      status: "COMPLETED",
      fileData: input.fileData,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      itemCount: input.itemCount,
      completedInMs: input.completedInMs,
      completedAt: serverNowIso(),
    })
    .where(eq(festivalExport.id, input.id));
}

export async function failExport(id: string, message: string): Promise<void> {
  await db
    .update(festivalExport)
    .set({
      status: "FAILED",
      errorMessage: message.slice(0, 500),
      completedAt: serverNowIso(),
    })
    .where(eq(festivalExport.id, id));
}

export type ExportRowMeta = Omit<FestivalExportRow, "fileData">;

export async function listExportsByFestival(
  festivalId: string,
): Promise<ExportRowMeta[]> {
  return db.query.festivalExport.findMany({
    where: eq(festivalExport.festivalId, festivalId),
    orderBy: [desc(festivalExport.queuedAt)],
    columns: { fileData: false }, // never ship bytes to the list view
  });
}

export async function getExportById(
  id: string,
  festivalId: string,
): Promise<FestivalExportRow | undefined> {
  return db.query.festivalExport.findFirst({
    where: and(
      eq(festivalExport.id, id),
      eq(festivalExport.festivalId, festivalId),
    ),
  });
}

/** Full row (including base64 `fileData`) for the download route. */
export async function getExportForDownload(
  id: string,
): Promise<FestivalExportRow | undefined> {
  return db.query.festivalExport.findFirst({
    where: eq(festivalExport.id, id),
  });
}

export async function deleteExport(
  id: string,
  festivalId: string,
): Promise<void> {
  await db
    .delete(festivalExport)
    .where(
      and(eq(festivalExport.id, id), eq(festivalExport.festivalId, festivalId)),
    );
}

/** Prune rows whose retention window has elapsed. Returns the number deleted. */
export async function deleteExpiredExports(): Promise<number> {
  const nowIso = serverNowIso();
  const deleted = await db
    .delete(festivalExport)
    .where(lt(festivalExport.expiresAt, nowIso))
    .returning({ id: festivalExport.id });
  return deleted.length;
}
