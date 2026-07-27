import { bulkCreateAssignmentInput } from "@/api/contracts/assignments";
import { badRequest, createHandler, ok } from "@/api/lib";
import { bulkCreateAssignmentAction } from "@/features/assignments/actions/assignment.actions";

// Not createProtectedHandler: the team-leader OTP portal (no admin session
// cookie) also creates assignments here. Auth is resolved per-request inside
// bulkCreateAssignmentAction via resolveAssignmentActorContext, which accepts
// either an admin session or a participant (team-leader) session.
const handler = createHandler({
  async POST({ request }) {
    const url = new URL(request.url);
    const festivalId = url.searchParams.get("festivalId");
    if (!festivalId)
      return badRequest("MISSING_PARAM", "festivalId is required");

    const body = await request.json();
    const data = body.data ?? body;
    const parsed = bulkCreateAssignmentInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);

    if (parsed.data.assignments.some((a) => !a.studentId)) {
      return badRequest(
        "INVALID_INPUT",
        "Each bulk assignment requires a studentId.",
      );
    }

    const result = await bulkCreateAssignmentAction(
      festivalId,
      parsed.data.assignments as {
        programmeId: string;
        studentId: string;
        teamNumber?: number;
      }[],
      parsed.data.teamLeadsByTeam,
    );
    return ok(result);
  },
});

export const POST = handler;
