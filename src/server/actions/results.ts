"use server";

import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { festival as festivalTable, result as resultTable, programme as programmeTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import { ResultModel } from "@/server/models/result.model";
import {
  setProgrammePublished,
  updateProgrammeStatus,
} from "@/server/services/programme-status.service";
import type { ActionResponse } from "@/types/actions";

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

function revalidateResultsPaths(
  slug: string,
  options?: { includeTeamStatus?: boolean },
) {
  revalidatePath(`/dashboard/${slug}/event-works/marks`);
  revalidatePath(`/dashboard/${slug}/event-works/judgment`);
  revalidatePath(`/dashboard/${slug}/event-works/leaderboard`);
  if (options?.includeTeamStatus) {
    revalidatePath(`/dashboard/${slug}/event-works/team-status`);
  }
  revalidatePath(`/${slug}/results`);
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
    await updateProgrammeStatus(data.programmeId);
    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, data.festivalId),
      columns: { slug: true },
    });
    if (festival) {
      revalidateResultsPaths(festival.slug, { includeTeamStatus: true });
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
    await updateProgrammeStatus(result.programmeId);
    revalidateResultsPaths(festivalSlug);
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Bulk publish/unpublish results for a programme
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

    await ResultModel.bulkPublishByProgramme(programmeId, isPublished);
    await setProgrammePublished(programmeId, isPublished);
    await updateProgrammeStatus(programmeId);
    revalidateResultsPaths(festivalSlug);
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Publish the current calculated team standings to the festival record
 */
export async function publishTeamStandings(
  festivalId: string,
  standings: Record<string, unknown>[],
  festivalSlug: string,
): Promise<ActionResponse<void>> {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, festivalId, { requireWritable: true });

    const { updateTeamStandings } = await import(
      "@/server/models/festival.model"
    );
    
    await updateTeamStandings(festivalId, standings);

    revalidatePath(`/${festivalSlug}`);
    revalidatePath(`/${festivalSlug}/results`);
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}
