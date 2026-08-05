import crypto from "crypto";
import {
  createCookieSession,
  deleteCookieSession,
  getCookieSession,
} from "@/core/auth/cookie-session";
import { db } from "@/core/database/client";
import { MS, nowPlus, serverNowIso } from "@/core/datetime/server";

export const STAGE_PORTAL_SESSION_COOKIE = "stage_portal_session";

export function createRawSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getStagePortalSessionExpiryDate(): Date {
  return nowPlus(24 * MS.hour); // 24 hours
}

export function getTokenHash(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function setStagePortalSessionCookie(
  rawToken: string,
  expiresAt: Date,
): Promise<void> {
  await createCookieSession(STAGE_PORTAL_SESSION_COOKIE, rawToken, {
    expires: expiresAt,
  });
}

export async function clearStagePortalSessionCookie(): Promise<void> {
  await deleteCookieSession(STAGE_PORTAL_SESSION_COOKIE);
}

export async function getStagePortalSessionCookie(): Promise<
  string | undefined
> {
  return getCookieSession(STAGE_PORTAL_SESSION_COOKIE);
}

export async function getStagePortalSessionFromCookie() {
  const rawToken = await getStagePortalSessionCookie();

  if (!rawToken) {
    return null;
  }

  const tokenHash = getTokenHash(rawToken);

  const sessionData = await db.query.stagePortalSession.findFirst({
    where: (s: any, { eq, and, isNull, gt }: any) =>
      and(
        eq(s.tokenHash, tokenHash),
        isNull(s.revokedAt),
        gt(s.expiresAt, serverNowIso()),
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

  if (!sessionData) {
    return null;
  }

  return sessionData;
}
