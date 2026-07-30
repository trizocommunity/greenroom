"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import { StageAssignmentService } from "@/features/stages/services/stage-assignment.service";

async function revalidateStageAssignmentPaths(festivalId: string) {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { slug: true },
  });
  if (!festival) return;
  revalidatePath(
    `/dashboard/${festival.slug}/pre-event-works/stage-management`,
  );
  revalidatePath(`/dashboard/${festival.slug}/members`);
}

export async function getStageAssignmentsAction(
  festivalId: string,
): Promise<
  ActionResponse<
    Awaited<ReturnType<typeof StageAssignmentService.listForFestival>>
  >
> {
  try {
    const session = await getSession();
    if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    await StageAssignmentService.getAccessibleStageIds(festivalId, session);
    const data = await StageAssignmentService.listForFestival(festivalId);
    return { success: true, data };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}

export async function assignStageManagerAction(
  festivalId: string,
  stageId: string,
  memberId: string,
): Promise<
  ActionResponse<Awaited<ReturnType<typeof StageAssignmentService.assign>>>
> {
  try {
    const session = await getSession();
    await StageAssignmentService.assertCanManageAssignments(
      festivalId,
      session,
    );
    const data = await StageAssignmentService.assign(
      festivalId,
      stageId,
      memberId,
    );
    await revalidateStageAssignmentPaths(festivalId);
    return { success: true, data };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}

export async function unassignStageManagerAction(
  festivalId: string,
  assignmentId: string,
): Promise<ActionResponse<null>> {
  try {
    const session = await getSession();
    await StageAssignmentService.assertCanManageAssignments(
      festivalId,
      session,
    );
    await StageAssignmentService.unassign(festivalId, assignmentId);
    await revalidateStageAssignmentPaths(festivalId);
    return { success: true, data: null };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}
