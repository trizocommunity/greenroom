import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/core/database/client";
import { festivalTemplateAssignment } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import type {
  AssignmentKind,
  TemplateAssignment,
} from "@/features/posters/types/template-assignment.types";

function mapRow(
  row: typeof festivalTemplateAssignment.$inferSelect,
): TemplateAssignment {
  return {
    id: row.id,
    festivalId: row.festivalId,
    templateCode: row.templateCode,
    assignmentKind: row.assignmentKind,
    fromResultNo: row.fromResultNo,
    toResultNo: row.toResultNo,
    certificateType: row.certificateType,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listByFestival(
  festivalId: string,
): Promise<TemplateAssignment[]> {
  const rows = await db.query.festivalTemplateAssignment.findMany({
    where: eq(festivalTemplateAssignment.festivalId, festivalId),
  });
  return rows.map(mapRow);
}

export async function listByKind(
  festivalId: string,
  kind: AssignmentKind,
): Promise<TemplateAssignment[]> {
  const rows = await db.query.festivalTemplateAssignment.findMany({
    where: and(
      eq(festivalTemplateAssignment.festivalId, festivalId),
      eq(festivalTemplateAssignment.assignmentKind, kind),
    ),
  });
  return rows.map(mapRow);
}

export async function upsertAssignment(input: {
  id: string;
  festivalId: string;
  templateCode: string;
  assignmentKind: AssignmentKind;
  fromResultNo?: number | null;
  toResultNo?: number | null;
  certificateType?: string | null;
}): Promise<string> {
  const now = serverNowIso();
  const existing = await db.query.festivalTemplateAssignment.findFirst({
    where: eq(festivalTemplateAssignment.id, input.id),
  });

  if (existing) {
    await db
      .update(festivalTemplateAssignment)
      .set({
        templateCode: input.templateCode,
        fromResultNo: input.fromResultNo ?? null,
        toResultNo: input.toResultNo ?? null,
        certificateType: input.certificateType ?? null,
        updatedAt: now,
      })
      .where(eq(festivalTemplateAssignment.id, input.id));
    return input.id;
  }

  await db.insert(festivalTemplateAssignment).values({
    id: input.id,
    festivalId: input.festivalId,
    templateCode: input.templateCode,
    assignmentKind: input.assignmentKind,
    fromResultNo: input.fromResultNo ?? null,
    toResultNo: input.toResultNo ?? null,
    certificateType: input.certificateType ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return input.id;
}

export async function deleteAssignment(id: string): Promise<void> {
  await db
    .delete(festivalTemplateAssignment)
    .where(eq(festivalTemplateAssignment.id, id));
}

export async function resolveResultTemplate(
  festivalId: string,
  resultNumber: number,
): Promise<string | null> {
  const row = await db.query.festivalTemplateAssignment.findFirst({
    where: and(
      eq(festivalTemplateAssignment.festivalId, festivalId),
      eq(festivalTemplateAssignment.assignmentKind, "RESULT_RANGE"),
      lte(festivalTemplateAssignment.fromResultNo, resultNumber),
      gte(festivalTemplateAssignment.toResultNo, resultNumber),
    ),
  });
  return row?.templateCode ?? null;
}

export async function resolveCertificateTemplate(
  festivalId: string,
  certificateType: string,
): Promise<string | null> {
  const row = await db.query.festivalTemplateAssignment.findFirst({
    where: and(
      eq(festivalTemplateAssignment.festivalId, festivalId),
      eq(festivalTemplateAssignment.assignmentKind, "CERTIFICATE_TYPE"),
      eq(festivalTemplateAssignment.certificateType, certificateType),
    ),
  });
  return row?.templateCode ?? null;
}

export async function resolveActiveBadge(
  festivalId: string,
): Promise<string | null> {
  const row = await db.query.festivalTemplateAssignment.findFirst({
    where: and(
      eq(festivalTemplateAssignment.festivalId, festivalId),
      eq(festivalTemplateAssignment.assignmentKind, "BADGE"),
    ),
  });
  return row?.templateCode ?? null;
}

export async function resolveActiveTeamPoints(
  festivalId: string,
): Promise<string | null> {
  const row = await db.query.festivalTemplateAssignment.findFirst({
    where: and(
      eq(festivalTemplateAssignment.festivalId, festivalId),
      eq(festivalTemplateAssignment.assignmentKind, "TEAM_POINTS"),
    ),
  });
  return row?.templateCode ?? null;
}

export async function hasOverlappingRange(
  festivalId: string,
  fromResultNo: number,
  toResultNo: number,
  excludeId?: string,
): Promise<boolean> {
  const existing = await listByKind(festivalId, "RESULT_RANGE");
  return existing.some((a) => {
    if (excludeId && a.id === excludeId) return false;
    if (a.fromResultNo == null || a.toResultNo == null) return false;
    return fromResultNo <= a.toResultNo && toResultNo >= a.fromResultNo;
  });
}
