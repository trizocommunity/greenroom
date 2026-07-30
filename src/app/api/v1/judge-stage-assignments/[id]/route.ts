import "server-only";

import { badRequest, notFound, ok, unauthorized } from "@/api/lib";
import { getSession } from "@/core/auth/session";
import { JudgeStageAssignmentService } from "@/features/stages/services/judge-stage-assignment.service";

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { id: assignmentId } = await params;
  const url = new URL(req.url);
  const festivalId = url.searchParams.get("festivalId");
  if (!festivalId) return badRequest("MISSING_PARAM", "festivalId is required");

  const existing = await JudgeStageAssignmentService.getById(assignmentId);
  if (!existing || existing.festivalId !== festivalId) {
    return notFound("NOT_FOUND", "Assignment not found");
  }

  await JudgeStageAssignmentService.assertCanManageAssignment(
    festivalId,
    session,
    existing.stageId,
  );
  await JudgeStageAssignmentService.unassign(festivalId, assignmentId);

  return ok({ success: true });
};
