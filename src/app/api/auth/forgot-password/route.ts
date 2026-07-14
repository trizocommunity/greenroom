import "server-only";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { authContract } from "@/contracts";
import { checkRateLimit, getClientIP } from "@/core/http/rate-limit";
import { createPasswordResetToken } from "@/features/auth/repositories/password-reset-token.repository";
import { findUserByEmail } from "@/features/auth/repositories/user.repository";

export const POST = async (req: Request) => {
  try {
    const ip = getClientIP(req);
    const rateLimit = checkRateLimit(
      `forgot-password:${ip}`,
      3,
      15 * 60 * 1000,
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = authContract.forgotPassword.body.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid email" },
        { status: 400 },
      );
    }

    const { email } = parsed.data;
    const user = await findUserByEmail(email);

    if (!user) {
      return NextResponse.json({ success: true });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await createPasswordResetToken({
      userId: user.id,
      token: tokenHash,
      expires: expiresAt.toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/forgot-password]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
