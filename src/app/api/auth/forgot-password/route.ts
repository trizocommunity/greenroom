import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { createPasswordResetToken } from "@/server/models/password-reset-token.model";
import { findUserByEmail } from "@/server/models/user.model";

export async function POST(request: Request) {
  try {
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
      user: { connect: { id: user.id } },
      token: tokenHash,
      expires: expiresAt,
    });

    // Mock Email sending
    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
