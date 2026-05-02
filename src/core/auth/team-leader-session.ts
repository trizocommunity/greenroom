import crypto from "crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/core/database/client";
import { teamLeaderSession as sessionTable } from "@/core/database/schema";

export const TEAM_LEADER_SESSION_COOKIE = "tl_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createRawSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getSessionExpiryDate(): Date {
  return new Date(Date.now() + SESSION_TTL_MS);
}

export async function setTeamLeaderSessionCookie(
  rawToken: string,
  expiresAt: Date,
) {
  const cookieStore = await cookies();
  cookieStore.set(TEAM_LEADER_SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearTeamLeaderSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TEAM_LEADER_SESSION_COOKIE);
}

export async function getTeamLeaderSessionFromCookie() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(TEAM_LEADER_SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  return db.query.teamLeaderSession.findFirst({
    where: eq(sessionTable.tokenHash, tokenHash),
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
        columns: { id: true, slug: true, tier: true },
      },
    },
  });
}

export function getTokenHash(rawToken: string): string {
  return hashToken(rawToken);
}
