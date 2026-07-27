"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festivalMember as festivalMemberTable,
  festival as festivalTable,
  programme as programmeTable,
  programmeReportingSession as reportingSessionTable,
  result as resultTable,
} from "@/core/database/schema";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import {
  setProgrammePublished,
  updateProgrammeStatus,
} from "@/features/programmes/services/programme-status.service";
import { ResultModel } from "@/features/results/repositories/result.repository";
import {
  assertProgrammeReadyToPublish,
  type BasicScoreRow,
  saveBasicProgrammeScores,
} from "@/features/results/services/basic-scoring.service";

export interface SaveResultInput {
  festivalId: string;
  programmeId: string;
  assignmentId: string;
  grade?: string | null;
  position?: number | null;
  points?: number;
  remarks?: string | null;
  isPublished?: boolean;
}

async function assertCanBulkPublishResults(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  festivalId: string,
) {
  if (session.role === "SUPER_ADMIN") return;

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { ownerId: true },
  });
  if (festival?.ownerId === session.userId) return;

  const member = await db.query.festivalMember.findFirst({
    where: and(
      eq(festivalMemberTable.festivalId, festivalId),
      eq(festivalMemberTable.userId, session.userId),
    ),
    columns: { role: true, isActive: true },
  });

  if (!member?.isActive || member.role === "ANNOUNCER") {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }
}

function revalidateResultsPaths(slug: string) {
  revalidatePath(`/dashboard/${slug}/event-works/marks`);
  revalidatePath(`/dashboard/${slug}/event-works/judgment`);
  revalidatePath(`/dashboard/${slug}/event-works/results`);
  revalidatePath(`/dashboard/${slug}/event-works/leaderboard`);
  revalidatePath(`/${slug}/results`);
}

async function latestClosedReportingSessionId(
  programmeId: string,
): Promise<string | undefined> {
  const row = await db.query.programmeReportingSession.findFirst({
    where: and(
      eq(reportingSessionTable.programmeId, programmeId),
      eq(reportingSessionTable.status, "CLOSED"),
    ),
    orderBy: [desc(reportingSessionTable.endedAt)],
    columns: { id: true },
  });
  return row?.id;
}

/**
 * Save or update a result for a programme assignment
 */
export async function saveResult(
  data: SaveResultInput,
): Promise<ActionResponse<Awaited<ReturnType<typeof ResultModel.upsert>>>> {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, data.festivalId, {
      requireWritable: true,
    });

    const result = await ResultModel.upsert(data.assignmentId, data);
    const reportingSessionId = await latestClosedReportingSessionId(
      data.programmeId,
    );
    await updateProgrammeStatus(data.programmeId, reportingSessionId);
    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, data.festivalId),
      columns: { slug: true },
    });
    if (festival) {
      revalidateResultsPaths(festival.slug);
    }
    return { success: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Delete a result
 */
export async function deleteResult(
  resultId: string,
  festivalSlug: string,
): Promise<ActionResponse<void>> {
  try {
    const session = await getSession();
    const result = await db.query.result.findFirst({
      where: eq(resultTable.id, resultId),
      columns: { festivalId: true, programmeId: true },
    });
    if (!result) throw new AppError(ERROR_MESSAGES.NOT_FOUND);
    await assertFestivalAccess(session, result.festivalId, {
      requireWritable: true,
    });

    await ResultModel.delete(resultId);
    const reportingSessionId = await latestClosedReportingSessionId(
      result.programmeId,
    );
    await updateProgrammeStatus(result.programmeId, reportingSessionId);
    revalidateResultsPaths(festivalSlug);
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Bulk publish/unpublish results for a programme.
 * Result posters are now sourced from the festival's published templates —
 * no per-programme template selection is required.
 */
export async function bulkPublishProgrammeResults(
  programmeId: string,
  isPublished: boolean,
  festivalSlug: string,
): Promise<ActionResponse<void>> {
  try {
    const session = await getSession();
    const programme = await db.query.programme.findFirst({
      where: eq(programmeTable.id, programmeId),
      columns: { festivalId: true },
    });
    if (!programme) throw new AppError(ERROR_MESSAGES.PROGRAMME_NOT_FOUND);
    await assertFestivalAccess(session, programme.festivalId, {
      requireWritable: true,
    });
    if (!session) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    await assertCanBulkPublishResults(session, programme.festivalId);

    if (isPublished) {
      await assertProgrammeReadyToPublish(programmeId);
    }

    await ResultModel.bulkPublishByProgramme(programmeId, isPublished);
    await setProgrammePublished(programmeId, isPublished);
    const reportingSessionId =
      await latestClosedReportingSessionId(programmeId);
    await updateProgrammeStatus(programmeId, reportingSessionId);
    revalidateResultsPaths(festivalSlug);
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Publish the current calculated team standings to the festival record
 */
export async function saveBasicProgrammeScoresAction(input: {
  festivalId: string;
  programmeId: string;
  rows: BasicScoreRow[];
}): Promise<ActionResponse<{ savedCount: number }>> {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, input.festivalId, {
      requireWritable: true,
    });

    const data = await saveBasicProgrammeScores(input);
    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, input.festivalId),
      columns: { slug: true },
    });
    if (festival) {
      revalidateResultsPaths(festival.slug);
    }
    return { success: true, data };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function publishTeamStandings(
  festivalId: string,
  standings: Record<string, unknown>[],
  festivalSlug: string,
): Promise<ActionResponse<void>> {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, festivalId, { requireWritable: true });
    if (!session) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    await assertCanBulkPublishResults(session, festivalId);

    const { updateTeamStandings } = await import(
      "@/features/festivals/repositories/festival.repository"
    );

    await updateTeamStandings(festivalId, standings);

    revalidatePath(`/${festivalSlug}`);
    revalidatePath(`/${festivalSlug}/results`);
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}
