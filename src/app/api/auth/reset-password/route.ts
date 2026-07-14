import "server-only";

import crypto from "crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { authContract } from "@/contracts";
import { hashPassword } from "@/core/auth/password";
import { db } from "@/core/database/client";
import { user as usersTable } from "@/core/database/schema";
import { checkRateLimit, getClientIP } from "@/core/http/rate-limit";
import {
  findValidPasswordResetToken,
  updatePasswordResetToken,
} from "@/features/auth/repositories/password-reset-token.repository";

export const POST = async (req: Request) => {
  try {
    const ip = getClientIP(req);
    const rateLimit = checkRateLimit(`reset-password:${ip}`, 3, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = authContract.resetPassword.body.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    const { token, password } = parsed.data;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetTokenRecord = await findValidPasswordResetToken(tokenHash);

    if (!resetTokenRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    const hashedPassword = await hashPassword(password);

    await db
      .update(usersTable)
      .set({ password: hashedPassword })
      .where(eq(usersTable.id, resetTokenRecord.userId));

    await updatePasswordResetToken(resetTokenRecord.id, {
      usedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/reset-password]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
