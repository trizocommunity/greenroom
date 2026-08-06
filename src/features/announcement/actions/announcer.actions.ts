"use server";

import { and, eq, sql, isNotNull, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  programme as programmeTable,
  result as resultTable,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { handleActionError } from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import { assertAnnouncerAccess } from "@/features/announcement/actions/announcement-access";
import { computeStandings, type TeamStandingRow } from "@/features/announcement/services/announcer.service";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import { ensureFestivalWritable } from "@/features/festivals/services/festival-context.service";
import { assertProgrammePrePublishing } from "@/features/programmes/services/programme-status.service";

function revalidateAnnouncerPaths(slug: string) {
  revalidatePath(`/dashboard/${slug}`);
  revalidatePath(`/dashboard/${slug}/event-works/announcement`);
  revalidatePath(`/dashboard/${slug}/event-works/results`);
  revalidatePath(`/dashboard/${slug}/event-works/top-scorers`);
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

export async function setProgrammeResultNumber(
  festivalId: string,
  programmeId: string,
  resultNumber: number,
): Promise<
  ActionResponse<{
    swappedWith?: { programmeId: string; name: string; previousNumber: number };
  }>
> {
  try {
    await assertAnnouncerAccess(festivalId);
    await ensureFestivalWritable(festivalId);

    const programme = await db.query.programme.findFirst({
      where: and(
        eq(programmeTable.id, programmeId),
        eq(programmeTable.festivalId, festivalId),
      ),
      columns: { id: true, name: true, resultNumber: true, status: true },
    });
    if (!programme) return { success: false, error: "Programme not found" };

    try {
      assertProgrammePrePublishing(programme.status);
    } catch (e: any) {
      return { success: false, error: e.message };
    }

    const existing = await db.query.programme.findFirst({
      where: and(
        eq(programmeTable.festivalId, festivalId),
        eq(programmeTable.resultNumber, resultNumber),
      ),
      columns: { id: true, name: true, status: true, resultNumber: true },
    });

    if (existing && existing.id !== programmeId) {
      if (existing.status === "PUBLISHED") {
        return {
          success: false,
          error: `Result number ${resultNumber} is already used by published result "${existing.name}". Swap published numbers from the Results page.`,
        };
      }

      const previousNumber = programme.resultNumber;
      await db
        .update(programmeTable)
        .set({ resultNumber: previousNumber, updatedAt: serverNowIso() })
        .where(eq(programmeTable.id, existing.id));

      await db
        .update(programmeTable)
        .set({ resultNumber, updatedAt: serverNowIso() })
        .where(eq(programmeTable.id, programmeId));

      const slug = await getFestivalSlug(festivalId);
      if (slug) revalidateAnnouncerPaths(slug);

      return {
        success: true,
        data: {
          swappedWith: {
            programmeId: existing.id,
            name: existing.name,
            previousNumber: resultNumber,
          },
        },
      };
    }

    await db
      .update(programmeTable)
      .set({ resultNumber, updatedAt: serverNowIso() })
      .where(eq(programmeTable.id, programmeId));

    const slug = await getFestivalSlug(festivalId);
    if (slug) revalidateAnnouncerPaths(slug);

    return { success: true, data: {} };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function announceResult(
  festivalId: string,
  programmeId: string,
): Promise<ActionResponse<void>> {
  try {
    const actorName = await assertAnnouncerAccess(festivalId);
    await ensureFestivalWritable(festivalId);

    const programme = await db.query.programme.findFirst({
      where: and(
        eq(programmeTable.id, programmeId),
        eq(programmeTable.festivalId, festivalId),
      ),
      columns: {
        id: true,
        name: true,
        resultNumber: true,
        status: true,
      },
    });
    if (!programme) return { success: false, error: "Programme not found" };

    if (programme.resultNumber == null) {
      return {
        success: false,
        error: "Assign a result number before announcing.",
      };
    }

    const session = await getSession();
    const now = serverNowIso();

    await db
      .update(resultTable)
      .set({
        isPublished: true,
        publishedByEmail: (session?.email as string) ?? null,
        publishedByName: actorName,
        updatedAt: now,
      })
      .where(eq(resultTable.programmeId, programmeId));

    await db
      .update(programmeTable)
      .set({
        status: "PUBLISHED",
        publishedAt: now,
        publishedByEmail: (session?.email as string) ?? null,
        publishedByName: actorName,
        updatedAt: now,
      })
      .where(eq(programmeTable.id, programmeId));

    const slug = await getFestivalSlug(festivalId);
    if (slug) revalidateAnnouncerPaths(slug);

    await createAuditLog({
      action: "ANNOUNCE_RESULTS",
      targetType: "RESULT",
      targetId: programmeId,
      metadata: { festivalId, programmeId },
    }).catch((err) => console.error("[AuditLog] ANNOUNCE_RESULTS failed", err));

    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function unpublishResult(
  festivalId: string,
  programmeId: string,
): Promise<ActionResponse<void>> {
  try {
    const session = await getSession();
    if (!session?.userId) return { success: false, error: "Unauthorized" };

    await assertAnnouncerAccess(festivalId);
    await ensureFestivalWritable(festivalId);

    const programme = await db.query.programme.findFirst({
      where: and(
        eq(programmeTable.id, programmeId),
        eq(programmeTable.festivalId, festivalId),
      ),
      columns: { id: true, status: true },
    });
    if (!programme) return { success: false, error: "Programme not found" };

    if (programme.status !== "PUBLISHED") {
      return {
        success: false,
        error: "Only published results can be unpublished.",
      };
    }

    const now = serverNowIso();
    await db
      .update(resultTable)
      .set({ isPublished: false, updatedAt: now })
      .where(eq(resultTable.programmeId, programmeId));

    await db
      .update(programmeTable)
      .set({
        status: "PENDING_PUBLICATION",
        publishedAt: null,
        updatedAt: now,
      })
      .where(eq(programmeTable.id, programmeId));

    const slug = await getFestivalSlug(festivalId);
    if (slug) revalidateAnnouncerPaths(slug);

    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function swapResultNumbers(
  festivalId: string,
  programmeIdA: string, // the dragged item
  programmeIdB: string, // the dropped over item
): Promise<ActionResponse<void>> {
  try {
    await assertAnnouncerAccess(festivalId);
    await ensureFestivalWritable(festivalId);

    // Fetch all programmes that have a resultNumber for this festival, sorted
    const programmes = await db.query.programme.findMany({
      where: and(
        eq(programmeTable.festivalId, festivalId),
        isNotNull(programmeTable.resultNumber)
      ),
      columns: { id: true, resultNumber: true, status: true },
      orderBy: [asc(programmeTable.resultNumber)],
    });

    const activeIndex = programmes.findIndex((p) => p.id === programmeIdA);
    const overIndex = programmes.findIndex((p) => p.id === programmeIdB);

    if (activeIndex === -1 || overIndex === -1) {
      return { success: false, error: "Programme not found or missing result number" };
    }

    const progA = programmes[activeIndex];
    const progB = programmes[overIndex];

    try {
      assertProgrammePrePublishing(progA.status);
      assertProgrammePrePublishing(progB.status);
    } catch (e: any) {
      return { success: false, error: e.message };
    }

    // Perform array move
    const newOrder = programmes.slice();
    newOrder.splice(overIndex < 0 ? newOrder.length + overIndex : overIndex, 0, newOrder.splice(activeIndex, 1)[0]);

    // Find which IDs need their result_number updated
    const updates: { id: string; newResultNumber: number }[] = [];
    for (let i = 0; i < newOrder.length; i++) {
      if (newOrder[i].resultNumber !== programmes[i].resultNumber) {
        updates.push({
          id: newOrder[i].id,
          newResultNumber: programmes[i].resultNumber!,
        });
      }
    }

    if (updates.length > 0) {
      const now = serverNowIso();
      await db.transaction(async (tx) => {
        // 1. Temporarily set to a negative value to avoid unique constraint violation
        for (let i = 0; i < updates.length; i++) {
          await tx.execute(sql`
            UPDATE "programme"
            SET "result_number" = ${-1000 - i},
                "updatedAt" = ${now}
            WHERE "id" = ${updates[i].id}
          `);
        }
        
        // 2. Set to the new correct resultNumber
        for (let i = 0; i < updates.length; i++) {
          await tx.execute(sql`
            UPDATE "programme"
            SET "result_number" = ${updates[i].newResultNumber},
                "updatedAt" = ${now}
            WHERE "id" = ${updates[i].id}
          `);
        }
      });
    }

    const slug = await getFestivalSlug(festivalId);
    if (slug) revalidateAnnouncerPaths(slug);

    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function publishStandings(
  festivalId: string,
  upToResultNumber?: number
): Promise<ActionResponse<void>> {
  try {
    await assertAnnouncerAccess(festivalId);
    await ensureFestivalWritable(festivalId);

    const standings = await computeStandings(festivalId, "published", upToResultNumber);

    const highestResult = await db.query.programme.findFirst({
      where: and(
        eq(programmeTable.festivalId, festivalId),
        eq(programmeTable.status, "PUBLISHED"),
      ),
      columns: { resultNumber: true },
      orderBy: (p, { desc }) => [desc(p.resultNumber)],
    });

    const now = serverNowIso();
    await db
      .update(festivalTable)
      .set({
        teamStandings: standings,
        standingsPublishedAtResultNumber: highestResult?.resultNumber ?? null,
        standingsPublishedAt: now,
        updatedAt: now,
      })
      .where(eq(festivalTable.id, festivalId));

    const slug = await getFestivalSlug(festivalId);
    if (slug) revalidateAnnouncerPaths(slug);

    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function fetchStandingsAction(
  festivalId: string,
  scope: "all" | "published",
  upToResultNumber?: number
): Promise<ActionResponse<TeamStandingRow[]>> {
  try {
    await assertAnnouncerAccess(festivalId);
    const standings = await computeStandings(festivalId, scope, upToResultNumber);
    return { success: true, data: standings };
  } catch (error) {
    return handleActionError(error);
  }
}
