"use server";

import { and, count, eq, inArray, or, sql } from "drizzle-orm";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  festival as festivalTable,
  programme as programmeTable,
  user as userTable,
} from "@/core/database/schema";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import { isProTier } from "@/features/plan-features/services/tier";
import { getProgrammeDetailForDrawer } from "@/features/programmes/loaders/programme-detail.loader";
import { ProgrammeService } from "@/features/programmes/services/programme.service";

async function getActorForCreatedBy(userId: string) {
  const user = await db.query.user.findFirst({
    where: eq(userTable.id, userId),
    columns: { email: true, fullName: true, displayName: true },
  });
  if (!user) return {};
  return {
    createdByEmail: user.email,
    createdByName: user.displayName || user.fullName || user.email,
  };
}

export async function getProgrammesAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  return ProgrammeService.getAll(festivalId);
}

export async function getProgrammeDetailsAction(
  festivalId: string,
  id: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  return ProgrammeService.getDetails(id, festivalId);
}

export async function validateProgrammesAction(
  festivalId: string,
  candidates: { name: string; categoryId: string; type: string }[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  if (candidates.length === 0) return {};

  // Build OR conditions for each candidate
  const conditions = candidates
    .filter((c) => c.name) // Ensure name exists
    .map((c) =>
      and(
        eq(sql`LOWER(${programmeTable.name})`, c.name.trim().toLowerCase()),
        eq(programmeTable.categoryId, c.categoryId),
        eq(programmeTable.type, c.type as "INDIVIDUAL" | "GROUP"),
      ),
    );

  if (conditions.length === 0) return {};

  const existing = await db.query.programme.findMany({
    where: and(eq(programmeTable.festivalId, festivalId), or(...conditions)),
    columns: { name: true, categoryId: true, type: true },
  });

  const conflicts: Record<string, string> = {};
  existing.forEach((p) => {
    const key = `${p.name.toLowerCase()}:${p.categoryId}:${p.type}`;
    conflicts[key] = "Programme already exists with this category and type";
  });

  return conflicts;
}

export async function createProgrammeAction(
  festivalId: string,
  data: {
    name: string;
    categoryId: string;
    type?: string;
    stageType?: string;
    maxParticipantsPerGroup?: number;
    maxTeamsPerGroup?: number;
    maxParticipantsPerTeam?: number;
    maxPoints?: number;
  },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const [categoryCountResult] = await db
    .select({ c: count() })
    .from(categoryTable)
    .where(eq(categoryTable.festivalId, festivalId));

  if (categoryCountResult.c === 0) {
    throw new AppError(ERROR_MESSAGES.CATEGORY_REQUIRED);
  }

  const actor = session?.userId
    ? await getActorForCreatedBy(session.userId)
    : {};

  const created = await ProgrammeService.create(
    festivalId,
    {
      name: data.name,
      categoryId: data.categoryId,
      type: data.type as "INDIVIDUAL" | "GROUP",
      stageType: data.stageType as "STAGE" | "NON_STAGE",
      maxParticipantsPerGroup: data.maxParticipantsPerGroup,
      maxTeamsPerGroup: data.maxTeamsPerGroup,
      maxParticipantsPerTeam: data.maxParticipantsPerTeam,
    },
    actor,
  );

  await createAuditLog({
    action: "CREATE_PROGRAMME",
    targetType: "PROGRAMME",
    targetId: created.id,
    metadata: {
      programmeId: created.id,
      name: data.name,
      categoryId: data.categoryId,
    },
  }).catch((err) => console.error("[AuditLog] CREATE_PROGRAMME failed", err));

  return created;
}

export async function bulkCreateProgrammesAction(
  festivalId: string,
  programmes: {
    name: string;
    categoryId: string;
    type: string;
    stageType: string;
    maxParticipantsPerGroup?: number;
    maxTeamsPerGroup?: number;
    maxParticipantsPerTeam?: number;
  }[],
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const formatted = programmes.map((p) => ({
    name: p.name,
    categoryId: p.categoryId,
    type: p.type as "INDIVIDUAL" | "GROUP",
    stageType: p.stageType as "STAGE" | "NON_STAGE",
    maxParticipantsPerGroup: p.maxParticipantsPerGroup,
    maxTeamsPerGroup: p.maxTeamsPerGroup,
    maxParticipantsPerTeam: p.maxParticipantsPerTeam,
  }));

  try {
    const result = await ProgrammeService.bulkCreate(festivalId, formatted);

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, festivalId),
      columns: { slug: true },
    });
    if (festival) {
      try {
        const { revalidatePath } = await import("next/cache");
        revalidatePath(
          `/dashboard/${festival.slug}/pre-event-works/programmes`,
        );
      } catch (err) {}
    }

    return { success: true, count: result.length };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}

export async function deleteProgrammeAction(festivalId: string, id: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  const deleted = await ProgrammeService.delete(id, festivalId);
  await createAuditLog({
    action: "DELETE_PROGRAMME",
    targetType: "PROGRAMME",
    targetId: id,
    metadata: { festivalId, programmeId: id },
  }).catch((err) => console.error("[AuditLog] DELETE_PROGRAMME failed", err));
  return deleted;
}

export async function updateProgrammeAction(
  festivalId: string,
  id: string,
  data: {
    name?: string;
    categoryId?: string;
    type?: string;
    stageType?: string;
    maxParticipantsPerGroup?: number;
    maxTeamsPerGroup?: number;
    maxParticipantsPerTeam?: number;
    maxPoints?: number;
  },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const updated = await ProgrammeService.update(id, festivalId, {
    name: data.name,
    categoryId: data.categoryId,
    type: data.type ? (data.type as "INDIVIDUAL" | "GROUP") : undefined,
    stageType: data.stageType
      ? (data.stageType as "STAGE" | "NON_STAGE")
      : undefined,
    maxParticipantsPerGroup: data.maxParticipantsPerGroup,
    maxTeamsPerGroup: data.maxTeamsPerGroup,
    maxParticipantsPerTeam: data.maxParticipantsPerTeam,
  });

  await createAuditLog({
    action: "UPDATE_PROGRAMME",
    targetType: "PROGRAMME",
    targetId: id,
    metadata: { programmeId: id, changes: data },
  }).catch((err) => console.error("[AuditLog] UPDATE_PROGRAMME failed", err));

  return updated;
}

/**
 * Programme drawer data. Panel A (summary/counts) is available on every
 * tier; teamLeads/auditTimeline (Panels B/C) are PRO-only and stripped
 * here rather than left to the frontend to hide.
 */
export async function getProgrammeDetailForDrawerAction(
  festivalId: string,
  programmeId: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { tier: true },
  });

  const detail = await getProgrammeDetailForDrawer(programmeId);

  if (!isProTier(festival?.tier)) {
    return { ...detail, teamLeads: {}, auditTimeline: [] };
  }
  return detail;
}

export async function getProgrammeRosterAction(
  festivalId: string,
  programmeId: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  
  const { getProgrammeAssignmentsAction } = await import(
    "@/features/programmes/actions/get-assignments.action"
  );
  const allAssignments = await getProgrammeAssignmentsAction(festivalId);
  return allAssignments.filter((a) => a.programmeId === programmeId);
}
