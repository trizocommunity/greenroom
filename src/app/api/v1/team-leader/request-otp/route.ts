import "server-only";

import { requestOtpInput } from "@/api/contracts/team-leader";
import { badRequest, createHandler, ok } from "@/api/lib";
import { TeamLeaderAuthService } from "@/features/team-leader/services/team-leader-auth.service";

const handler = createHandler({
  async POST({ request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = requestOtpInput.safeParse(data);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const result = await TeamLeaderAuthService.requestOtp(parsed.data);
    return ok(result);
  },
});

export const POST = handler;
