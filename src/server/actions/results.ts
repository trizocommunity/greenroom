"use server";

import type { Prisma } from "@/app/generated/prisma/client";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types/actions";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { ResultModel } from "@/server/models/result.model";

export interface SaveResultInput {
  festivalId: string;
  programmeId: string;
  assignmentId: string;
  grade?: string | null;
  position?: number | null;
  score?: number;
  points?: number;
  remarks?: string | null;
  isPublished?: boolean;
}

function revalidateResultsPaths(slug: string, options?: { includeTeamStatus?: boolean }) {
  revalidatePath(`/dashboard/${slug}/event-works/results`);
  revalidatePath(`/dashboard/${slug}/event-works/leaderboard`);
  if (options?.includeTeamStatus) {
    revalidatePath(`/dashboard/${slug}/event-works/team-status`);
  }
  revalidatePath(`/${slug}/results`);
}

/**
 * Save or update a result for a programme assignment
 */
export async function saveResult(data: SaveResultInput): Promise<ActionResponse<Awaited<ReturnType<typeof ResultModel.upsert>>>> {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, data.festivalId);

    const result = await ResultModel.upsert(data.assignmentId, data);
    const festival = await prisma.festival.findUnique({
      where: { id: data.festivalId },
      select: { slug: true },
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
export async function deleteResult(resultId: string, festivalSlug: string): Promise<ActionResponse<void>> {
  try {
    const session = await getSession();
    const result = await prisma.result.findUnique({
      where: { id: resultId },
      select: { festivalId: true },
    });
    if (!result) throw new AppError(ERROR_MESSAGES.NOT_FOUND);
    await assertFestivalAccess(session, result.festivalId);

    await ResultModel.delete(resultId);
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
    const programme = await prisma.programme.findUnique({
      where: { id: programmeId },
      select: { festivalId: true },
    });
    if (!programme) throw new AppError(ERROR_MESSAGES.PROGRAMME_NOT_FOUND);
    await assertFestivalAccess(session, programme.festivalId);

    await ResultModel.bulkPublishByProgramme(programmeId, isPublished);
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
    await assertFestivalAccess(session, festivalId);

    const { updateTeamStandings } = await import(
      "@/server/models/festival.model"
    );
    const standingsJson = JSON.parse(
      JSON.stringify(standings),
    ) as Prisma.InputJsonValue;
    await updateTeamStandings(festivalId, standingsJson);

    revalidatePath(`/${festivalSlug}`);
    revalidatePath(`/${festivalSlug}/results`);
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}
