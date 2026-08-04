"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import {
  ensureFestivalWritable,
  getFestivalContext,
} from "@/features/festivals/services/festival-context.service";
import { canManageTemplates } from "@/features/posters/auth/poster-access";
import * as AssignmentRepo from "@/features/posters/repositories/template-assignment.repository";
import * as PosterTemplateRepo from "@/features/posters/repositories/poster-template.repository";
import type {
  AssignmentKind,
  TemplateAssignment,
} from "@/features/posters/types/template-assignment.types";

async function assertAssignmentAccess(festivalId: string) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  await ensureFestivalWritable(festivalId);

  const ctx = await getFestivalContext({
    slugOrId: festivalId,
    userId: session.userId,
    globalRole: session.role,
  });
  if (!ctx || !canManageTemplates(ctx.role)) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }
}

function revalidateAssignmentPaths(slug: string) {
  revalidatePath(`/dashboard/${slug}/templates`);
  revalidatePath(`/${slug}/results`);
  revalidatePath(`/${slug}`);
}

export async function listAssignmentsAction(
  festivalId: string,
): Promise<ActionResponse<TemplateAssignment[]>> {
  try {
    const session = await getSession();
    if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    await assertFestivalAccess(session, festivalId);
    const assignments = await AssignmentRepo.listByFestival(festivalId);
    return { success: true, data: assignments };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function upsertResultRangeAction(
  festivalId: string,
  festivalSlug: string,
  input: {
    id?: string;
    templateCode: string;
    fromResultNo: number;
    toResultNo: number;
  },
): Promise<ActionResponse<{ id: string }>> {
  try {
    await assertAssignmentAccess(festivalId);

    if (input.fromResultNo > input.toResultNo) {
      return { success: false, error: "From must be less than or equal to To" };
    }

    const template = await PosterTemplateRepo.findByFestivalAndCode(
      festivalId,
      input.templateCode,
    );
    if (!template || template.status !== "PUBLISHED") {
      return { success: false, error: "Only published templates can be assigned" };
    }

    const id = input.id ?? randomUUID();
    const overlapping = await AssignmentRepo.hasOverlappingRange(
      festivalId,
      input.fromResultNo,
      input.toResultNo,
      input.id,
    );
    if (overlapping) {
      return { success: false, error: "Result number range overlaps with an existing assignment" };
    }

    await AssignmentRepo.upsertAssignment({
      id,
      festivalId,
      templateCode: input.templateCode,
      assignmentKind: "RESULT_RANGE",
      fromResultNo: input.fromResultNo,
      toResultNo: input.toResultNo,
    });

    revalidateAssignmentPaths(festivalSlug);
    return { success: true, data: { id } };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function upsertCertificateTypeAction(
  festivalId: string,
  festivalSlug: string,
  input: {
    id?: string;
    templateCode: string;
    certificateType: string;
  },
): Promise<ActionResponse<{ id: string }>> {
  try {
    await assertAssignmentAccess(festivalId);

    const template = await PosterTemplateRepo.findByFestivalAndCode(
      festivalId,
      input.templateCode,
    );
    if (!template || template.status !== "PUBLISHED") {
      return { success: false, error: "Only published templates can be assigned" };
    }

    const existing = await AssignmentRepo.listByKind(
      festivalId,
      "CERTIFICATE_TYPE",
    );
    const match = existing.find(
      (a) => a.certificateType === input.certificateType,
    );

    const id = match?.id ?? input.id ?? randomUUID();
    await AssignmentRepo.upsertAssignment({
      id,
      festivalId,
      templateCode: input.templateCode,
      assignmentKind: "CERTIFICATE_TYPE",
      certificateType: input.certificateType,
    });

    revalidateAssignmentPaths(festivalSlug);
    return { success: true, data: { id } };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function upsertSingleAssignmentAction(
  festivalId: string,
  festivalSlug: string,
  input: {
    templateCode: string;
    assignmentKind: "BADGE" | "TEAM_POINTS";
  },
): Promise<ActionResponse<{ id: string }>> {
  try {
    await assertAssignmentAccess(festivalId);

    const template = await PosterTemplateRepo.findByFestivalAndCode(
      festivalId,
      input.templateCode,
    );
    if (!template || template.status !== "PUBLISHED") {
      return { success: false, error: "Only published templates can be assigned" };
    }

    const existing = await AssignmentRepo.listByKind(
      festivalId,
      input.assignmentKind,
    );
    const id = existing[0]?.id ?? randomUUID();

    await AssignmentRepo.upsertAssignment({
      id,
      festivalId,
      templateCode: input.templateCode,
      assignmentKind: input.assignmentKind,
    });

    revalidateAssignmentPaths(festivalSlug);
    return { success: true, data: { id } };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteAssignmentAction(
  festivalId: string,
  festivalSlug: string,
  assignmentId: string,
): Promise<ActionResponse<void>> {
  try {
    await assertAssignmentAccess(festivalId);
    await AssignmentRepo.deleteAssignment(assignmentId);
    revalidateAssignmentPaths(festivalSlug);
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}
