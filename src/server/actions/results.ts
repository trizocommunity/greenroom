"use server";

import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
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

/**
 * Save or update a result for a programme assignment
 */
export async function saveResult(data: SaveResultInput) {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, data.festivalId);

    const result = await ResultModel.upsert(data.assignmentId, data);
    const festival = await prisma.festival.findUnique({
      where: { id: data.festivalId },
      select: { slug: true },
    });
    if (festival) {
      revalidatePath(`/dashboard/${festival.slug}/event-works/results`);
      revalidatePath(`/dashboard/${festival.slug}/event-works/team-status`);
      revalidatePath(`/${festival.slug}/results`);
    }
    return { success: true, data: result };
  } catch (error) {
    console.error("Error saving result:", error);
    return { success: false, error: "Failed to save result" };
  }
}

/**
 * Delete a result
 */
export async function deleteResult(resultId: string, festivalSlug: string) {
  try {
    const session = await getSession();
    const result = await prisma.result.findUnique({
      where: { id: resultId },
      select: { festivalId: true },
    });
    if (!result) return { success: false, error: "Result not found" };
    await assertFestivalAccess(session, result.festivalId);

    await ResultModel.delete(resultId);
    revalidatePath(`/dashboard/${festivalSlug}/event-works/results`);
    revalidatePath(`/dashboard/${festivalSlug}/event-works/leaderboard`);
    revalidatePath(`/${festivalSlug}/results`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting result:", error);
    return { success: false, error: "Failed to delete result" };
  }
}

/**
 * Bulk publish/unpublish results for a programme
 */
export async function bulkPublishProgrammeResults(
  programmeId: string,
  isPublished: boolean,
  festivalSlug: string,
) {
  try {
    const session = await getSession();
    const programme = await prisma.programme.findUnique({
      where: { id: programmeId },
      select: { festivalId: true },
    });
    if (!programme) return { success: false, error: "Programme not found" };
    await assertFestivalAccess(session, programme.festivalId);

    await ResultModel.bulkPublishByProgramme(programmeId, isPublished);
    revalidatePath(`/dashboard/${festivalSlug}/event-works/results`);
    revalidatePath(`/dashboard/${festivalSlug}/event-works/leaderboard`);
    revalidatePath(`/${festivalSlug}/results`);
    return { success: true };
  } catch (error) {
    console.error("Error bulk publishing programme results:", error);
    return { success: false, error: "Failed to update results" };
  }
}

/**
 * Publish the current calculated team standings to the festival record
 */
export async function publishTeamStandings(
  festivalId: string,
  standings: Record<string, unknown>[],
  festivalSlug: string,
) {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, festivalId);

    // We need to import this dynamically or move it to a better place to avoid circular deps if any
    // checks festival.model.ts for "updateTeamStandings"
    const { updateTeamStandings } = await import(
      "@/server/models/festival.model"
    );

    // Ensure standings is a plain object/array for Prisma JSON
    // This strips any non-serializable data and ensures it matches the Json type
    const standingsJson = JSON.parse(JSON.stringify(standings));

    await updateTeamStandings(festivalId, standingsJson);

    revalidatePath(`/${festivalSlug}`);
    revalidatePath(`/${festivalSlug}/results`);
    return { success: true };
  } catch (error) {
    console.error("Error publishing standings:", error);
    return { success: false, error: "Failed to publish standings" };
  }
}
