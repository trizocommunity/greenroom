import "server-only";

import { verifyOtpInput } from "@/api/contracts/team-leader";
import { badRequest, createHandler, ok } from "@/api/lib";
import { setTeamLeaderSessionCookie } from "@/core/auth/team-leader-session";
import { TeamLeaderAuthService } from "@/features/team-leader/services/team-leader-auth.service";

const handler = createHandler({
  async POST({ request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = verifyOtpInput.safeParse(data);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const { rawToken, expiresAt } = await TeamLeaderAuthService.verifyOtp({
      ...parsed.data,
      ipAddress: request.headers.get("x-forwarded-for") ?? null,
      userAgent: request.headers.get("user-agent") ?? null,
    });

    await setTeamLeaderSessionCookie(rawToken, expiresAt);

    return ok({ success: true });
  },
});

export const POST = handler;
