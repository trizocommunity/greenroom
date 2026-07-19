import "server-only";

import { updateAssignmentInput } from "@/api/contracts/assignments";
import { badRequest, notFound, ok, unauthorized } from "@/api/lib";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { AssignmentService } from "@/features/assignments/services/assignment.service";

export const PUT = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();

  const { id } = await params;
  const url = new URL(req.url);
  const festivalId = url.searchParams.get("festivalId");
  if (!festivalId) return badRequest("MISSING_PARAM", "festivalId is required");

  const body = await req.json();
  const data = body.data ?? body;

  const parsed = updateAssignmentInput.safeParse(data);
  if (!parsed.success) return badRequest("INVALID_INPUT", parsed.error.message);

  await assertFestivalAccess(session, festivalId);

  try {
    const result = await AssignmentService.update(id, festivalId, parsed.data);
    return ok(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return notFound("ASSIGNMENT_NOT_FOUND", message);
    }
    throw error;
  }
};
