import { NextResponse } from "next/server";
import { z } from "zod";
import { formatApiError } from "@/lib/api-error";
import { requestTeamLeaderOtpSchema } from "@/lib/validations/team-leader-auth";
import { TeamLeaderAuthService } from "@/server/services/team-leader-auth.service";

export async function POST(request: Request) {
  try {
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
