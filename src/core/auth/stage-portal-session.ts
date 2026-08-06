import { and, eq, gt, isNull } from "drizzle-orm";
import { createDbBackedCookieSession } from "@/core/auth/db-backed-cookie-session";
import { db } from "@/core/database/client";
import { stagePortalSession } from "@/core/database/schema";
import { MS, nowPlus, serverNowIso } from "@/core/datetime/server";

export const STAGE_PORTAL_SESSION_COOKIE = "stage_portal_session";

const session = createDbBackedCookieSession({
  cookieName: STAGE_PORTAL_SESSION_COOKIE,
  getExpiryDate: () => nowPlus(24 * MS.hour),
  async loadSession(tokenHash) {
    const sessionData = await db.query.stagePortalSession.findFirst({
      where: and(
        eq(stagePortalSession.tokenHash, tokenHash),
        isNull(stagePortalSession.revokedAt),
        gt(stagePortalSession.expiresAt, serverNowIso()),
      ),
      with: {
        stage: {
          columns: { id: true, festivalId: true, name: true, isOffStage: true },
        },
        festival: {
          columns: { id: true, slug: true, tier: true },
        },
      },
    });

    return sessionData ?? null;
  },
});

export const {
  createRawSessionToken,
  getTokenHash,
  getSessionExpiryDate: getStagePortalSessionExpiryDate,
  setCookie: setStagePortalSessionCookie,
  clearCookie: clearStagePortalSessionCookie,
  getCookie: getStagePortalSessionCookie,
  getSessionFromCookie: getStagePortalSessionFromCookie,
} = session;
