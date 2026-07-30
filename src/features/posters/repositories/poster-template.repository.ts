import { and, desc, eq } from "drizzle-orm";
import type { PosterEditorDocument } from "@/components/editor/poster-editor-types";
import { db } from "@/core/database/client";
import { festivalPosterTemplate } from "@/core/database/schema";
import type {
  PosterTemplateRecord,
  PosterTemplateStatus,
  PosterTemplateType,
} from "@/features/posters/types/poster-template.types";

function mapRow(
  row: typeof festivalPosterTemplate.$inferSelect,
): PosterTemplateRecord {
  return {
    id: row.id,
    festivalId: row.festivalId,
    type: row.type,
    code: row.code,
    status: row.status,
    width: row.width,
    height: row.height,
    konvaJson: row.konvaJson as PosterEditorDocument,
    backgroundUrl: row.backgroundUrl,
    meta: (row.meta as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function findByFestivalAndCode(
  festivalId: string,
  code: string,
): Promise<PosterTemplateRecord | null> {
  const row = await db.query.festivalPosterTemplate.findFirst({
    where: and(
      eq(festivalPosterTemplate.festivalId, festivalId),
      eq(festivalPosterTemplate.code, code),
    ),
  });
  return row ? mapRow(row) : null;
}

export async function listByFestival(festivalId: string) {
  const rows = await db.query.festivalPosterTemplate.findMany({
    where: eq(festivalPosterTemplate.festivalId, festivalId),
    orderBy: [desc(festivalPosterTemplate.updatedAt)],
  });
  return rows.map(mapRow);
}

export async function listPublishedResultTemplates(festivalId: string) {
  const rows = await db.query.festivalPosterTemplate.findMany({
    where: and(
      eq(festivalPosterTemplate.festivalId, festivalId),
      eq(festivalPosterTemplate.type, "RESULT"),
      eq(festivalPosterTemplate.status, "PUBLISHED"),
    ),
  });
  return rows.map(mapRow);
}

export async function countPublishedResultSlots(festivalId: string) {
  const rows = await listPublishedResultTemplates(festivalId);
  return rows.length;
}

export async function upsertTemplate(input: {
  id: string;
  festivalId: string;
  type: PosterTemplateType;
  code: string;
  status: PosterTemplateStatus;
  width: number;
  height: number;
  konvaJson: PosterEditorDocument;
  backgroundUrl?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  const now = new Date().toISOString();
  const existing = await findByFestivalAndCode(input.festivalId, input.code);
  if (existing) {
    await db
      .update(festivalPosterTemplate)
      .set({
        type: input.type,
        status: input.status,
        width: input.width,
        height: input.height,
        konvaJson: input.konvaJson,
        backgroundUrl: input.backgroundUrl ?? null,
        meta: input.meta ?? null,
        updatedAt: now,
      })
      .where(eq(festivalPosterTemplate.id, existing.id));
    return existing.id;
  }
  const id = input.id;
  await db.insert(festivalPosterTemplate).values({
    id,
    festivalId: input.festivalId,
    type: input.type,
    code: input.code,
    status: input.status,
    width: input.width,
    height: input.height,
    konvaJson: input.konvaJson,
    backgroundUrl: input.backgroundUrl ?? null,
    meta: input.meta ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return input.id;
}

export async function updateStatus(
  festivalId: string,
  code: string,
  status: PosterTemplateStatus,
) {
  const now = new Date().toISOString();
  await db
    .update(festivalPosterTemplate)
    .set({ status, updatedAt: now })
    .where(
      and(
        eq(festivalPosterTemplate.festivalId, festivalId),
        eq(festivalPosterTemplate.code, code),
      ),
    );
}

export async function deleteByCode(festivalId: string, code: string) {
  await db
    .delete(festivalPosterTemplate)
    .where(
      and(
        eq(festivalPosterTemplate.festivalId, festivalId),
        eq(festivalPosterTemplate.code, code),
      ),
    );
}

export async function deleteAllByFestival(festivalId: string) {
  await db
    .delete(festivalPosterTemplate)
    .where(eq(festivalPosterTemplate.festivalId, festivalId));
}
