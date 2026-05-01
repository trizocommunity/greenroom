import { NextResponse } from "next/server";
import {
  clearTeamLeaderSessionCookie,
  TEAM_LEADER_SESSION_COOKIE,
} from "@/core/auth/team-leader-session";
import { TeamLeaderAuthService } from "@/features/team-leader/services/team-leader-auth.service";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${TEAM_LEADER_SESSION_COOKIE}=`));
  const rawToken = match ? decodeURIComponent(match.split("=")[1] || "") : null;

  if (rawToken) {
    await TeamLeaderAuthService.revokeSessionByRawToken(rawToken);
  }
  await clearTeamLeaderSessionCookie();
  return NextResponse.json({ success: true });
}
