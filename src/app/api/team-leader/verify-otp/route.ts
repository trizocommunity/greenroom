import { NextResponse } from "next/server";
import { z } from "zod";
import { formatApiError } from "@/lib/api-error";
import { setTeamLeaderSessionCookie } from "@/lib/team-leader-auth/session";
import { verifyTeamLeaderOtpSchema } from "@/lib/validations/team-leader-auth";
import { TeamLeaderAuthService } from "@/server/services/team-leader-auth.service";

function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = verifyTeamLeaderOtpSchema.parse(body);

    const { rawToken, expiresAt } = await TeamLeaderAuthService.verifyOtp({
      ...input,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    await setTeamLeaderSessionCookie(rawToken, expiresAt);
    return NextResponse.json({ success: true });
  } catch (error) {
    const payload = formatApiError(error);
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(payload, { status });
  }
}
