import crypto from "node:crypto";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { RealtimePrincipalType } from "@/lib/realtime-config";
import { getTeamLeaderSessionFromCookie } from "@/lib/team-leader-auth/session";

export type RealtimePrincipal = {
  principalId: string;
  principalType: RealtimePrincipalType;
  festivalIds: string[];
  roles: string[];
  studentId?: string;
};

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function resolveRealtimePrincipal(options?: {
  judgeToken?: string | null;
  festivalId?: string | null;
}): Promise<RealtimePrincipal | null> {
  const session = await getSession();
  if (session?.userId) {
    const memberships = await prisma.festivalMember.findMany({
      where: { userId: session.userId, isActive: true },
      select: { festivalId: true, role: true },
    });
    const ownFestivals = await prisma.festival.findMany({
      where: { ownerId: session.userId },
      select: { id: true },
    });
    const festivalIds = new Set<string>([
      ...memberships.map((m) => m.festivalId),
      ...ownFestivals.map((f) => f.id),
    ]);
    if (session.role === "SUPER_ADMIN" && options?.festivalId) {
      festivalIds.add(options.festivalId);
    }
    return {
      principalId: session.userId,
      principalType: "dashboard-user",
      festivalIds: Array.from(festivalIds),
      roles: Array.from(new Set([...memberships.map((m) => m.role), session.role])),
    };
  }

  const tlSession = await getTeamLeaderSessionFromCookie();
  if (tlSession && tlSession.expiresAt > new Date() && !tlSession.revokedAt) {
    return {
      principalId: tlSession.id,
      principalType: "team-leader",
      festivalIds: [tlSession.festivalId],
      roles: ["TEAM_LEADER"],
      studentId: tlSession.studentId,
    };
  }

  const judgeToken = options?.judgeToken?.trim();
  if (judgeToken) {
    const tokenHash = sha256(judgeToken);
    const judgeSession = await prisma.programmeJudgeSession.findUnique({
      where: { token_hash: tokenHash },
      select: {
        id: true,
        festival_id: true,
        used_at: true,
        open_expires_at: true,
      },
    });
    if (
      judgeSession &&
      !judgeSession.used_at &&
      judgeSession.open_expires_at &&
      judgeSession.open_expires_at > new Date()
    ) {
      return {
        principalId: judgeSession.id,
        principalType: "judge-session",
        festivalIds: [judgeSession.festival_id],
        roles: ["JUDGE"],
      };
    }
  }

  return null;
}
