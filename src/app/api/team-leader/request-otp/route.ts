import { NextResponse } from "next/server";
import { z } from "zod";
import { formatApiError } from "@/core/http/api-error";
import { checkRateLimit, getClientIP } from "@/core/http/rate-limit";
import { requestTeamLeaderOtpSchema } from "@/features/auth/schemas/team-leader-auth.schema";
import { TeamLeaderAuthService } from "@/features/team-leader/services/team-leader-auth.service";

export async function POST(request: Request) {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(
      `team-leader-otp:${clientIP}`,
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
    const input = requestTeamLeaderOtpSchema.parse(body);
    const result = await TeamLeaderAuthService.requestOtp(input);
    return NextResponse.json({
      success: true,
      ...(process.env.NODE_ENV === "production"
        ? {}
        : { debugOtp: result.debugOtp }),
    });
  } catch (error) {
    const payload = formatApiError(error);
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(payload, { status });
  }
}
