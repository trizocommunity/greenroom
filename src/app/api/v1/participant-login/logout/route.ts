import "server-only";
import { cookies } from "next/headers";
import { createHandler, ok } from "@/api/lib";
import {
  clearParticipantSessionCookie,
  PARTICIPANT_SESSION_COOKIE,
} from "@/core/auth/participant-session";
import { ParticipantLoginService } from "@/features/participant-login/services/participant-login.service";

const handler = createHandler({
  async POST() {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(PARTICIPANT_SESSION_COOKIE)?.value;
    if (rawToken)
      await ParticipantLoginService.revokeSessionByRawToken(rawToken);
    await clearParticipantSessionCookie();
    return ok({ success: true });
  },
});

export const POST = handler;
