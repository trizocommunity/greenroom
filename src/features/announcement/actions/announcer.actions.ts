"use server";

import { and, eq, sql } from "drizzle-orm";
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
import {
  computeStandings,
  type TeamStandingRow,
} from "@/features/announcement/services/announcer.service";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import { ensureFestivalWritable } from "@/features/festivals/services/festival-context.service";

function revalidateAnnouncerPaths(slug: string) {
  revalidatePath(`/dashboard/${slug}`);
  revalidatePath(`/dashboard/${slug}/event-works/announcer`);
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
      columns: { id: true, name: true, resultNumber: true },
    });
    if (!programme)
      return { success: false, error: "Programme not found" };

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
    if (!programme)
      return { success: false, error: "Programme not found" };

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
    }).catch((err) =>
      console.error("[AuditLog] ANNOUNCE_RESULTS failed", err),
    );

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
    if (!session?.userId)
      return { success: false, error: "Unauthorized" };

    await assertAnnouncerAccess(festivalId);
    await ensureFestivalWritable(festivalId);

    const programme = await db.query.programme.findFirst({
      where: and(
        eq(programmeTable.id, programmeId),
        eq(programmeTable.festivalId, festivalId),
      ),
      columns: { id: true, status: true },
    });
    if (!programme)
      return { success: false, error: "Programme not found" };

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
        status: "JUDGED",
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
  programmeIdA: string,
  programmeIdB: string,
): Promise<ActionResponse<void>> {
  try {
    await assertAnnouncerAccess(festivalId);
    await ensureFestivalWritable(festivalId);

    const [progA, progB] = await Promise.all([
      db.query.programme.findFirst({
        where: and(
          eq(programmeTable.id, programmeIdA),
          eq(programmeTable.festivalId, festivalId),
        ),
        columns: { id: true, resultNumber: true },
      }),
      db.query.programme.findFirst({
        where: and(
          eq(programmeTable.id, programmeIdB),
          eq(programmeTable.festivalId, festivalId),
        ),
        columns: { id: true, resultNumber: true },
      }),
    ]);

    if (!progA || !progB)
      return { success: false, error: "Programme not found" };
    if (progA.resultNumber == null || progB.resultNumber == null)
      return {
        success: false,
        error: "Both programmes must have result numbers to swap.",
      };

    const now = serverNowIso();
    await db.execute(sql`
      UPDATE "programme"
      SET "result_number" = CASE
        WHEN "id" = ${programmeIdA} THEN ${progB.resultNumber}
        WHEN "id" = ${programmeIdB} THEN ${progA.resultNumber}
      END,
      "updatedAt" = ${now}
      WHERE "id" IN (${programmeIdA}, ${programmeIdB})
    `);

    const slug = await getFestivalSlug(festivalId);
    if (slug) revalidateAnnouncerPaths(slug);

    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function publishStandings(
  festivalId: string,
): Promise<ActionResponse<void>> {
  try {
    await assertAnnouncerAccess(festivalId);
    await ensureFestivalWritable(festivalId);

    const standings = await computeStandings(festivalId, "published");

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
        standingsPublishedAtResultNumber:
          highestResult?.resultNumber ?? null,
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
