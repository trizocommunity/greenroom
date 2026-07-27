import "server-only";
import { requestAccessInput } from "@/api/contracts/participant-login";
import { badRequest, createHandler, ok } from "@/api/lib";
import { setParticipantSessionCookie } from "@/core/auth/participant-session";
import { ParticipantLoginService } from "@/features/participant-login/services/participant-login.service";

const handler = createHandler({
  async POST({ request }) {
    const body = await request.json();
    const data = body.data ?? body;
    const parsed = requestAccessInput.safeParse(data);
    if (!parsed.success)
      return badRequest("INVALID_INPUT", parsed.error.message);

    const result = await ParticipantLoginService.requestAccess(parsed.data);

    if (result.status === "AUTHENTICATED") {
      await setParticipantSessionCookie(result.rawToken, result.expiresAt);
      return ok({
        status: "AUTHENTICATED",
        studentSlug: result.studentSlug,
        festivalName: result.festivalName,
        expiresAt: result.expiresAt.toISOString(),
      });
    }

    return ok({
      status: "OTP_REQUIRED",
      studentSlug: result.studentSlug,
      festivalName: result.festivalName,
      debugOtp: result.debugOtp,
    });
  },
});

export const POST = handler;
