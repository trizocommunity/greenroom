import { and, eq, gt, isNull } from "drizzle-orm";
import { createDbBackedCookieSession } from "@/core/auth/db-backed-cookie-session";
import { db } from "@/core/database/client";
import { participantSession } from "@/core/database/schema";
import { MS, nowPlus, serverNowIso } from "@/core/datetime/server";

export const PARTICIPANT_SESSION_COOKIE = "participant_session";

const session = createDbBackedCookieSession({
  cookieName: PARTICIPANT_SESSION_COOKIE,
  getExpiryDate: () => nowPlus(12 * MS.hour),
  async loadSession(tokenHash) {
    const sessionData = await db.query.participantSession.findFirst({
      where: and(
        eq(participantSession.tokenHash, tokenHash),
        isNull(participantSession.revokedAt),
        gt(participantSession.expiresAt, serverNowIso()),
      ),
      with: {
        participant: {
          columns: {
            id: true,
            festivalId: true,
            profileSlug: true,
            isTeamLeader: true,
            groupId: true,
            categoryId: true,
          },
        },
        festival: {
          columns: {
            id: true,
            slug: true,
            tier: true,
          },
        },
      },
    });

    return sessionData ?? null;
  },
});

export const {
  createRawSessionToken,
  getTokenHash,
  getSessionExpiryDate,
  setCookie: setParticipantSessionCookie,
  clearCookie: clearParticipantSessionCookie,
  getCookie: getParticipantSessionCookie,
  getSessionFromCookie: getParticipantSessionFromCookie,
} = session;
