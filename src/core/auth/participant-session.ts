import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/core/database/client";

export const PARTICIPANT_SESSION_COOKIE = "participant_session";

export function createRawSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getSessionExpiryDate(): Date {
  return new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
}

export function getTokenHash(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function setParticipantSessionCookie(
  rawToken: string,
  expiresAt: Date,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PARTICIPANT_SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearParticipantSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PARTICIPANT_SESSION_COOKIE);
}

export async function getParticipantSessionCookie(): Promise<
  string | undefined
> {
  const cookieStore = await cookies();
  return cookieStore.get(PARTICIPANT_SESSION_COOKIE)?.value;
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
        gt(s.expiresAt, new Date().toISOString()),
      ),
    with: {
      student: {
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
