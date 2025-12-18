import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { resetPasswordSchema } from "@/lib/validations/auth";
import {
  findValidPasswordResetToken,
  updatePasswordResetToken,
} from "@/server/models/password-reset-token.model";
import { findUserById, updateUser } from "@/server/models/user.model";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetTokenRecord = await findValidPasswordResetToken(tokenHash);

    if (!resetTokenRecord) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    const hashedPassword = await hashPassword(password);

    await updateUser(resetTokenRecord.userId, {
      passwordHash: hashedPassword,
    });

    await updatePasswordResetToken(resetTokenRecord.id, {
      usedAt: new Date(),
    });

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
