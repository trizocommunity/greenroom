import { createAssignmentInput } from "@/api/contracts/assignments";
import {
  badRequest,
  createHandler,
  createProtectedHandler,
  ok,
} from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { deleteAssignmentAction } from "@/features/assignments/actions/assignment.actions";
import { AssignmentService } from "@/features/assignments/services/assignment.service";

const protectedHandler = createProtectedHandler({
  async GET({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    await assertFestivalAccess(user, festivalId);
    const data = await AssignmentService.getAll(festivalId);
    return ok(data);
  },

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
    const result = await AssignmentService.create(festivalId, parsed.data);
    return ok(result);
  },
});

// Not createProtectedHandler: the team-leader OTP portal (no admin session
// cookie) also deletes assignments here. Auth is resolved per-request inside
// deleteAssignmentAction via resolveAssignmentActorContext.
const deleteHandler = createHandler({
  async DELETE({ request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");

    const body = await request.json().catch(() => ({}));
    const assignmentId =
      body.assignmentId ?? url.searchParams.get("assignmentId");
    if (!assignmentId)
      return badRequest("MISSING_PARAM", "assignmentId is required");

    const result = await deleteAssignmentAction(
      festivalId,
      assignmentId,
      body.replacementLeadStudentId,
    );
    return ok(result);
  },
});

export const GET = protectedHandler;
export const POST = protectedHandler;
export const DELETE = deleteHandler;
