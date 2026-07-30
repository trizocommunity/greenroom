import { assignJudgeStageInput } from "@/api/contracts/judge-stage-assignments";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { JudgeStageAssignmentService } from "@/features/stages/services/judge-stage-assignment.service";
import { StageAssignmentService } from "@/features/stages/services/stage-assignment.service";

const handler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");

    // Any active festival member (incl. STAGE_MANAGER) may view all judge/stage
    // assignments — this throws if the viewer has no access to the festival at all.
    await StageAssignmentService.getAccessibleStageIds(festivalId, user);
    const assignments =
      await JudgeStageAssignmentService.listForFestival(festivalId);
    return ok(assignments);
  },

  async POST({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");

    const body = await request.json();
    const data = body.data ?? body;
    const parsed = assignJudgeStageInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);

    await JudgeStageAssignmentService.assertCanManageAssignment(
      festivalId,
      user,
      parsed.data.stageId,
    );
    const assignment = await JudgeStageAssignmentService.assign(
      festivalId,
      parsed.data.stageId,
      parsed.data.judgeId,
    );
    return ok(assignment);
  },
});

export const GET = handler;
export const POST = handler;
