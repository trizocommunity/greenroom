import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { formatApiError } from "@/lib/api-error";
import { hashPassword } from "@/lib/auth/password";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validations/auth";
import {
  findValidPasswordResetToken,
  updatePasswordResetToken,
} from "@/server/models/password-reset-token.model";
import { updateUser } from "@/server/models/user.model";
import { createAuditLog } from "@/server/services/audit-log.service";

export async function POST(request: Request) {
  try {
    // Rate limiting: 3 attempts per 15 minutes per IP
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`reset-password:${clientIP}`, 3, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

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
      password: hashedPassword,
    });

    await updatePasswordResetToken(resetTokenRecord.id, {
      usedAt: new Date(),
    });

    // Audit log password reset
    await createAuditLog({
      action: "PASSWORD_RESET",
      targetType: "USER",
      targetId: resetTokenRecord.userId,
      metadata: { ipAddress: clientIP },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const payload = formatApiError(error);
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(payload, { status });
  }
}
