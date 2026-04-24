import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { APP_URL } from "@/config/routes";
import { formatApiError } from "@/lib/api-error";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { createPasswordResetToken } from "@/server/models/password-reset-token.model";
import { findUserByEmail } from "@/server/models/user.model";

export async function POST(request: Request) {
  try {
    // Rate limiting: 3 attempts per 15 minutes per IP
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`forgot-password:${clientIP}`, 3, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    const user = await findUserByEmail(email);

    if (!user) {
      // Don't reveal user existence
      return NextResponse.json({ success: true });
    }

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await createPasswordResetToken({
      userId: user.id,
      token: tokenHash,
      expires: expiresAt.toISOString(),
    });

    // Use configured APP_URL instead of hardcoded localhost
    const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    const payload = formatApiError(error);
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(payload, { status });
  }
}
