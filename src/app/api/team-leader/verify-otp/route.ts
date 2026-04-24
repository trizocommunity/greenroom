import { NextResponse } from "next/server";
import { z } from "zod";
import { formatApiError } from "@/lib/api-error";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { setTeamLeaderSessionCookie } from "@/lib/team-leader-auth/session";
import { verifyTeamLeaderOtpSchema } from "@/lib/validations/team-leader-auth";
import { TeamLeaderAuthService } from "@/server/services/team-leader-auth.service";

export async function POST(request: Request) {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`verify-otp:${clientIP}`, 5, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const input = verifyTeamLeaderOtpSchema.parse(body);

    const { rawToken, expiresAt } = await TeamLeaderAuthService.verifyOtp({
      ...input,
      ipAddress: clientIP,
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
