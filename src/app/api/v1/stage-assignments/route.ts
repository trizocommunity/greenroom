import { assignStageManagerInput } from "@/api/contracts/stage-assignments";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { StageAssignmentService } from "@/features/stages/services/stage-assignment.service";

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");

    await StageAssignmentService.getAccessibleStageIds(festivalId, user);
    const assignments = await StageAssignmentService.listForFestival(
      festivalId,
    );
    return ok(assignments);
  },

  async POST({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");

    const body = await request.json();
    const data = body.data ?? body;
    const parsed = assignStageManagerInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);

    await StageAssignmentService.assertCanManageAssignments(festivalId, user);
    const assignment = await StageAssignmentService.assign(
      festivalId,
      parsed.data.stageId,
      parsed.data.memberId,
    );
    return ok(assignment);
  },
});

export const GET = handler;
export const POST = handler;
