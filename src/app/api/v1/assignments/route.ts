import { createAssignmentInput } from "@/api/contracts/assignments";
import {
  badRequest,
  createHandler,
  createProtectedHandler,
  ok,
} from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import {
  deleteAssignmentAction,
  getAssignmentsAction,
} from "@/features/assignments/actions/assignment.actions";
import { AssignmentService } from "@/features/assignments/services/assignment.service";

// GET/DELETE also serve the team-leader OTP portal (no admin session
// cookie), so they resolve auth per-request via the assignment actions
// (admin session OR participant/team-leader session). POST (single create)
// has no team-leader caller today, so it stays admin-only.
const dualAuthHandler = createHandler({
  async GET({ request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    const data = await getAssignmentsAction(festivalId);
    return ok(data);
  },

  async DELETE({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    const body = await request.json();
    const data = body.data ?? body;
    const assignmentId = data.assignmentId as string | undefined;
    if (!assignmentId)
      return badRequest("MISSING_PARAM", "assignmentId is required");

    if (user) {
      await assertFestivalAccess(user, festivalId);
      const result = await AssignmentService.delete(assignmentId, festivalId);
      try {
        const { revalidatePath } = await import("next/cache");
        revalidatePath("/", "layout");
      } catch (e) {}
      return ok(result);
    }

    const result = await deleteAssignmentAction(festivalId, assignmentId);
    return ok(result);
  },
});

const adminOnlyHandler = createProtectedHandler({
  async POST({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    await assertFestivalAccess(user, festivalId);
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = createAssignmentInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);
    let result;
    if (parsed.data.participantId) {
      result = await AssignmentService.create(festivalId, {
        programmeId: parsed.data.programmeId,
        participantId: parsed.data.participantId,
      });
    } else if (parsed.data.groupId) {
      result = await AssignmentService.create(festivalId, {
        programmeId: parsed.data.programmeId,
        groupId: parsed.data.groupId,
        teamNumber: parsed.data.teamNumber,
      });
    } else {
      return badRequest("INVALID_INPUT", "participantId or groupId required");
    }
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
    } catch (e) {}
    return ok(result);
  },
});

export const GET = dualAuthHandler;
export const DELETE = dualAuthHandler;
export const POST = adminOnlyHandler;
