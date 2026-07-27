"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  programme as programmeTable,
} from "@/core/database/schema";
import { handleActionError } from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import { assertAnnouncerAccess } from "@/features/announcement/actions/announcement-access";
import {
  countPendingAnnounceSlotsForProgramme,
  getAnnouncerBlockProgress,
} from "@/features/announcement/services/announcer-result-count.service";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import { updateFestivalAnnouncerState } from "@/features/festivals/repositories/festival.repository";
import { ensureFestivalWritable } from "@/features/festivals/services/festival-context.service";
import {
  setProgrammeAnnounced,
  setProgrammePublished,
  updateProgrammeStatus,
} from "@/features/programmes/services/programme-status.service";
import { ResultModel } from "@/features/results/repositories/result.repository";

function revalidateAnnouncementPaths(slug: string) {
  revalidatePath(`/dashboard/${slug}`);
  revalidatePath(`/dashboard/${slug}/announcer`);
  revalidatePath(`/dashboard/${slug}/event-works/announcement-desk`);
  revalidatePath(`/dashboard/${slug}/event-works/group-standings`);
  revalidatePath(`/dashboard/${slug}/event-works/results`);
  revalidatePath(`/dashboard/${slug}/event-works/leaderboard`);
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/results`);
}

async function getFestivalSlug(festivalId: string) {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { slug: true },
  });
  return festival?.slug;
}

/**
 * Publish programme results to the announcement desk (not on public yet).
 */
export async function publishProgrammeToDesk(
  festivalId: string,
  programmeId: string,
): Promise<ActionResponse<{ resumedResultsBatch: boolean }>> {
  try {
    await assertAnnouncerAccess(festivalId);
    await ensureFestivalWritable(festivalId);

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, festivalId),
      columns: {
        slug: true,
        publicDisplayMode: true,
      },
    });
    if (!festival) return { success: false, error: "Festival not found" };

    let resumedResultsBatch = false;
    if (festival.publicDisplayMode === "team_standings") {
      await updateFestivalAnnouncerState(festivalId, {
        publicDisplayMode: "programme_results",
      });
      resumedResultsBatch = true;
    }

    await ResultModel.bulkPublishByProgramme(programmeId, true);
    await setProgrammePublished(programmeId, true);
    await updateProgrammeStatus(programmeId);

    if (festival.slug) revalidateAnnouncementPaths(festival.slug);
    return { success: true, data: { resumedResultsBatch } };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Mark a programme as announced on-air (visible on public when in programme_results mode).
 */
export async function markProgrammeAnnounced(
  festivalId: string,
  programmeId: string,
): Promise<
  ActionResponse<{
    standingsDue: boolean;
    announcedResultsSinceStandings: number;
    resultsPerBlock: number;
    slotsAnnounced: number;
  }>
> {
  try {
    await assertAnnouncerAccess(festivalId);
    await ensureFestivalWritable(festivalId);

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, festivalId),
      columns: {
        slug: true,
        announcerResultsPerStandings: true,
        announcedProgrammesSinceStandings: true,
      },
    });
    if (!festival) return { success: false, error: "Festival not found" };

    const programme = await db.query.programme.findFirst({
      where: and(
        eq(programmeTable.id, programmeId),
        eq(programmeTable.festivalId, festivalId),
      ),
      columns: { id: true },
    });
    if (!programme) return { success: false, error: "Programme not found" };

    const slotsAnnounced = await countPendingAnnounceSlotsForProgramme(
      festivalId,
      programmeId,
    );
    if (slotsAnnounced === 0) {
      return {
        success: false,
        error: "No unpublished-on-air results on the desk for this programme",
      };
    }

    await ResultModel.bulkAnnounceByProgramme(programmeId);
    await setProgrammeAnnounced(programmeId, true);
    await updateProgrammeStatus(programmeId);

    const perBlock = Math.max(1, festival.announcerResultsPerStandings ?? 10);
    const nextCount =
      (festival.announcedProgrammesSinceStandings ?? 0) + slotsAnnounced;
    const standingsDue = nextCount > 0 && nextCount % perBlock === 0;

    await updateFestivalAnnouncerState(festivalId, {
      announcedProgrammesSinceStandings: nextCount,
    });

    if (festival.slug) revalidateAnnouncementPaths(festival.slug);
    await createAuditLog({
      action: "ANNOUNCE_RESULTS",
      targetType: "RESULT",
      targetId: programmeId,
      metadata: { festivalId, programmeId, slotsAnnounced },
    }).catch((err) => console.error("[AuditLog] ANNOUNCE_RESULTS failed", err));
    return {
      success: true,
      data: {
        standingsDue,
        announcedResultsSinceStandings: nextCount,
        resultsPerBlock: perBlock,
        slotsAnnounced,
      },
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export type TeamStandingInput = {
  name: string;
  points: number;
  rank?: number;
  isGroup?: boolean;
};

/**
 * Publish team standings to the public site (standings-only mode).
 */
export async function publishAnnouncedStandings(
  festivalId: string,
  standings: TeamStandingInput[],
): Promise<ActionResponse<void>> {
  try {
    await assertAnnouncerAccess(festivalId);
    await ensureFestivalWritable(festivalId);

    const block = await getAnnouncerBlockProgress(festivalId);
    if (!block.canPublishStandings) {
      return {
        success: false,
        error: `Announce at least ${block.resultsPerBlock} results on-air before publishing group standings (${block.announcedResultsSinceStandings}/${block.resultsPerBlock} so far).`,
      };
    }

    const ranked = standings.map((row, index) => ({
      ...row,
      rank: row.rank ?? index + 1,
    }));

    await updateFestivalAnnouncerState(festivalId, {
      teamStandings: ranked,
      publicDisplayMode: "team_standings",
      announcedProgrammesSinceStandings: 0,
    });

    const slug = await getFestivalSlug(festivalId);
    if (slug) revalidateAnnouncementPaths(slug);
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Resume programme-results display on the public site (e.g. before next batch).
 */
export async function beginNextResultsBatch(
  festivalId: string,
): Promise<ActionResponse<void>> {
  try {
    await assertAnnouncerAccess(festivalId);
    await ensureFestivalWritable(festivalId);

    await updateFestivalAnnouncerState(festivalId, {
      publicDisplayMode: "programme_results",
    });

    const slug = await getFestivalSlug(festivalId);
    if (slug) revalidateAnnouncementPaths(slug);
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateAnnouncerResultsPerStandings(
  festivalId: string,
  count: number,
): Promise<ActionResponse<void>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Unauthorized" };
    }
    await assertAnnouncerAccess(festivalId);
    await ensureFestivalWritable(festivalId);

    const safe = Math.max(1, Math.min(100, Math.floor(count)));
    await updateFestivalAnnouncerState(festivalId, {
      announcerResultsPerStandings: safe,
    });

    const slug = await getFestivalSlug(festivalId);
    if (slug) revalidateAnnouncementPaths(slug);
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}
