import { createAssignmentInput } from "@/api/contracts/assignments";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { AssignmentService } from "@/features/assignments/services/assignment.service";

const handler = createProtectedHandler({
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

  async DELETE({ user, request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    const assignmentId = url.searchParams.get("assignmentId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");
    if (!assignmentId)
      return badRequest("MISSING_PARAM", "assignmentId is required");
    await assertFestivalAccess(user, festivalId);
    const result = await AssignmentService.delete(assignmentId, festivalId);
    return ok(result);
  },
});

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
