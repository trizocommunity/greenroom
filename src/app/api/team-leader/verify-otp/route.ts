import { NextResponse } from "next/server";
import { z } from "zod";
import { setTeamLeaderSessionCookie } from "@/core/auth/team-leader-session";
import { formatApiError } from "@/core/http/api-error";
import { checkRateLimit, getClientIP } from "@/core/http/rate-limit";
import { verifyTeamLeaderOtpSchema } from "@/features/auth/schemas/team-leader-auth.schema";
import { TeamLeaderAuthService } from "@/features/team-leader/services/team-leader-auth.service";

export async function POST(request: Request) {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(
      `verify-otp:${clientIP}`,
      5,
      15 * 60 * 1000,
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 },
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
