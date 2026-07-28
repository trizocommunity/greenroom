import "server-only";
import { verifyOtpInput } from "@/api/contracts/participant-login";
import { badRequest, createHandler, ok } from "@/api/lib";
import { setParticipantSessionCookie } from "@/core/auth/participant-session";
import { ParticipantLoginService } from "@/features/participant-login/services/participant-login.service";

const handler = createHandler({
  async POST({ request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = verifyOtpInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);

    const { rawToken, expiresAt, participantSlug, isTeamLeader } =
      await ParticipantLoginService.verifyOtp({
        ...parsed.data,
        ipAddress: request.headers.get("x-forwarded-for") ?? null,
        userAgent: request.headers.get("user-agent") ?? null,
      });

    await setParticipantSessionCookie(rawToken, expiresAt);
    return ok({
      success: true,
      participantSlug,
      isTeamLeader,
      expiresAt: expiresAt.toISOString(),
    });
  },
});

export const POST = handler;
