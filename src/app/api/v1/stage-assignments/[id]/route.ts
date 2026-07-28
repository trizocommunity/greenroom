import "server-only";

import { badRequest, ok, unauthorized } from "@/api/lib";
import { getSession } from "@/core/auth/session";
import { StageAssignmentService } from "@/features/stages/services/stage-assignment.service";

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { id: assignmentId } = await params;
  const url = new URL(req.url);
  const festivalId = url.searchParams.get("festivalId");
  if (!festivalId)
    return badRequest("MISSING_PARAM", "festivalId is required");

  await StageAssignmentService.assertCanManageAssignments(
    festivalId,
    session,
  );
  await StageAssignmentService.unassign(festivalId, assignmentId);

  return ok({ success: true });
};
