"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { ensureOffStageStage } from "@/features/stages/services/off-stage.service";

/**
 * Provision the off-stage stage for a festival that doesn't have one yet.
 *
 * Idempotent: returns the existing off-stage row when present. Used by the
 * stage-grid "Provision Off-Stage" button for ongoing festivals that were
 * created before ISSUE-XX shipped, or for festivals whose off-stage row was
 * somehow deleted (e.g. via direct SQL).
 *
 * The caller must hold writable access to the festival (owner / admin /
 * super-admin).
 */
export async function provisionOffStageAction(festivalId: string) {
  const session = await getSession();
  if (!session?.userId) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const offStage = await ensureOffStageStage(festivalId);

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { slug: true },
  });

  if (festival) {
    revalidatePath(
      `/dashboard/${festival.slug}/pre-event-works/stage-management`,
    );
  }

  return {
    stageId: offStage.id,
    name: offStage.name,
  };
}