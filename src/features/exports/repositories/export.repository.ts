import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  festivalExport,
  festivalPosterTemplate,
  group as groupTable,
  programme as programmeTable,
  stage as stageTable,
  user as userTable,
} from "@/core/database/schema";
import { fromNow, serverNowIso } from "@/core/datetime/server";
import { exportConfigSchema } from "@/features/exports/schemas/export-config.schema";
import type {
  ExportFormat,
  ExportType,
  FestivalExportRow,
} from "@/features/exports/types/export.types";

const RETENTION_DAYS = 1;
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
  cloudinaryPublicId?: string;
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
      cloudinaryPublicId: input.cloudinaryPublicId ?? null,
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

/**
 * Batch-resolve human-readable names for every ID referenced in a list of
 * export configs (teams, categories, programmes, stages, templates).
 *
 * Single `IN (...)` query per resource type so the list view stays O(1)
 * queries regardless of how many exports are on screen. Returns maps keyed
 * by id; the caller slices the per-row subset from these.
 */
export async function resolveExportNames(
  festivalId: string,
  rows: ExportRowMeta[],
): Promise<{
  teamNamesById: Map<string, string>;
  categoryNamesById: Map<string, string>;
  programmeNamesById: Map<string, string>;
  stageNamesById: Map<string, string>;
  /** Template id → display name (uses `code` since templates don't have a name column). */
  templateNamesById: Map<string, string>;
}> {
  const teamIds = new Set<string>();
  const categoryIds = new Set<string>();
  const programmeIds = new Set<string>();
  const stageIds = new Set<string>();
  const templateIds = new Set<string>();

  for (const row of rows) {
    const parsed = exportConfigSchema.safeParse(row.config);
    if (!parsed.success) continue;
    const cfg = parsed.data;
    if ("teamIds" in cfg && Array.isArray(cfg.teamIds))
      for (const id of cfg.teamIds) teamIds.add(id);
    if ("categoryIds" in cfg && Array.isArray(cfg.categoryIds))
      for (const id of cfg.categoryIds) categoryIds.add(id);
    if ("programmeIds" in cfg && Array.isArray(cfg.programmeIds))
      for (const id of cfg.programmeIds) programmeIds.add(id);
    if ("stageIds" in cfg && Array.isArray(cfg.stageIds))
      for (const id of cfg.stageIds) stageIds.add(id);
    if ("templateId" in cfg && cfg.templateId) templateIds.add(cfg.templateId);
  }

  const idArray = (set: Set<string>) => (set.size ? Array.from(set) : null);

  const [teamRows, categoryRows, programmeRows, stageRows, templateRows] =
    await Promise.all([
      idArray(teamIds)
        ? db
            .select({ id: groupTable.id, name: groupTable.name })
            .from(groupTable)
            .where(
              and(
                eq(groupTable.festivalId, festivalId),
                inArray(groupTable.id, idArray(teamIds) as string[]),
              ),
            )
        : Promise.resolve([] as Array<{ id: string; name: string }>),
      idArray(categoryIds)
        ? db
            .select({ id: categoryTable.id, name: categoryTable.name })
            .from(categoryTable)
            .where(
              and(
                eq(categoryTable.festivalId, festivalId),
                inArray(categoryTable.id, idArray(categoryIds) as string[]),
              ),
            )
        : Promise.resolve([] as Array<{ id: string; name: string }>),
      idArray(programmeIds)
        ? db
            .select({ id: programmeTable.id, name: programmeTable.name })
            .from(programmeTable)
            .where(
              and(
                eq(programmeTable.festivalId, festivalId),
                inArray(programmeTable.id, idArray(programmeIds) as string[]),
              ),
            )
        : Promise.resolve([] as Array<{ id: string; name: string }>),
      idArray(stageIds)
        ? db
            .select({ id: stageTable.id, name: stageTable.name })
            .from(stageTable)
            .where(
              and(
                eq(stageTable.festivalId, festivalId),
                inArray(stageTable.id, idArray(stageIds) as string[]),
              ),
            )
        : Promise.resolve([] as Array<{ id: string; name: string }>),
      idArray(templateIds)
        ? db
            .select({
              id: festivalPosterTemplate.id,
              code: festivalPosterTemplate.code,
            })
            .from(festivalPosterTemplate)
            .where(
              and(
                eq(festivalPosterTemplate.festivalId, festivalId),
                inArray(
                  festivalPosterTemplate.id,
                  idArray(templateIds) as string[],
                ),
              ),
            )
        : Promise.resolve([] as Array<{ id: string; code: string }>),
    ]);

  return {
    teamNamesById: new Map(teamRows.map((r) => [r.id, r.name])),
    categoryNamesById: new Map(categoryRows.map((r) => [r.id, r.name])),
    programmeNamesById: new Map(programmeRows.map((r) => [r.id, r.name])),
    stageNamesById: new Map(stageRows.map((r) => [r.id, r.name])),
    templateNamesById: new Map(templateRows.map((r) => [r.id, r.code])),
  };
}
