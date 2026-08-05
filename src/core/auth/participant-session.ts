import crypto from "crypto";
import {
  createCookieSession,
  deleteCookieSession,
  getCookieSession,
} from "@/core/auth/cookie-session";
import { db } from "@/core/database/client";
import { MS, nowPlus, serverNowIso } from "@/core/datetime/server";

export const PARTICIPANT_SESSION_COOKIE = "participant_session";

export function createRawSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getSessionExpiryDate(): Date {
  return nowPlus(12 * MS.hour); // 12 hours
}

export function getTokenHash(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function setParticipantSessionCookie(
  rawToken: string,
  expiresAt: Date,
): Promise<void> {
  await createCookieSession(PARTICIPANT_SESSION_COOKIE, rawToken, {
    expires: expiresAt,
  });
}

export async function clearParticipantSessionCookie(): Promise<void> {
  await deleteCookieSession(PARTICIPANT_SESSION_COOKIE);
}

export async function getParticipantSessionCookie(): Promise<
  string | undefined
> {
  return getCookieSession(PARTICIPANT_SESSION_COOKIE);
}

export async function getParticipantSessionFromCookie() {
  const rawToken = await getParticipantSessionCookie();

  if (!rawToken) {
    return null;
  }

  const tokenHash = getTokenHash(rawToken);

  const sessionData = await db.query.participantSession.findFirst({
    where: (s: any, { eq, and, isNull, gt }: any) =>
      and(
        eq(s.tokenHash, tokenHash),
        isNull(s.revokedAt),
        gt(s.expiresAt, serverNowIso()),
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

  if (!sessionData) {
    return null;
  }

  return sessionData;
}
