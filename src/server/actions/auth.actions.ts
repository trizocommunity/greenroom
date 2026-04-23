"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { userLoginEvent as userLoginEvents } from "../db/schema";
import { sendPasswordResetEmail } from "@/lib/email";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import {
  forgotPasswordSchema,
  loginSchema,
  onboardingSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import {
  createPasswordResetToken,
  findValidPasswordResetToken,
  updatePasswordResetToken,
} from "@/server/models/password-reset-token.model";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
} from "@/server/models/user.model";
import { createAuditLog } from "@/server/services/audit-log.service";
import type { ActionResponse } from "@/types/actions";

export async function loginAction(
  data: z.infer<typeof loginSchema>,
): Promise<ActionResponse<{ role: string }>> {
  try {
    const { email, password } = loginSchema.parse(data);

    const user = await findUserByEmail(email);

    if (!user || user.isActive === false) {
      throw new AppError(ERROR_MESSAGES.ACCOUNT_INACTIVE);
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    await createSession(user.id, user.globalRole);

    const { randomUUID } = await import("crypto");
    await db.insert(userLoginEvents).values({ id: randomUUID(), userId: user.id });

    return { success: true, data: { role: user.globalRole } };
  } catch (error) {
    // For security, if it's an Auth error we might want to be vague in production,
    // but the requirement is "User-friendly".
    // "Invalid credentials" is safe enough.
    return handleActionError(error);
  }
}

export async function registerAction(
  data: z.infer<typeof registerSchema>,
): Promise<ActionResponse<Record<string, unknown>>> {
  try {
    const { email, password } = registerSchema.parse(data);

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      throw new AppError(ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED);
    }

    const hashedPassword = await hashPassword(password);

    const user = await createUser({
      email,
      password: hashedPassword,
    });

    await createSession(user.id, user.globalRole);

    const { password: _, ...userWithoutPassword } = user;

    return { success: true, data: userWithoutPassword };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function forgotPasswordAction(
  data: z.infer<typeof forgotPasswordSchema>,
): Promise<ActionResponse<null>> {
  try {
    const { email } = forgotPasswordSchema.parse(data);

    const user = await findUserByEmail(email);

    if (!user) {
      // Don't reveal user existence, return success
      return { success: true, data: null };
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
      expires: expiresAt,
    });

    // BUG-2 FIX: Actually send the password reset email via Resend.
    // sendPasswordResetEmail handles RESEND_API_KEY absence gracefully in dev.
    await sendPasswordResetEmail(user.email, resetToken);

    return { success: true, data: null };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function resetPasswordAction(
  data: z.infer<typeof resetPasswordSchema>,
): Promise<ActionResponse<null>> {
  try {
    const { token, password } = resetPasswordSchema.parse(data);

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetTokenRecord = await findValidPasswordResetToken(tokenHash);

    if (!resetTokenRecord) {
      throw new AppError(ERROR_MESSAGES.INVALID_RESET_TOKEN);
    }

    const hashedPassword = await hashPassword(password);

    await updateUser(resetTokenRecord.userId, {
      password: hashedPassword,
    });

    await updatePasswordResetToken(resetTokenRecord.id, {
      usedAt: new Date(),
    });

    return { success: true, data: null };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function completeOnboardingAction(
  data: z.infer<typeof onboardingSchema>,
): Promise<ActionResponse<null>> {
  try {
    const session = await getSession();

    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const { fullName, displayName } = onboardingSchema.parse(data);

    await updateUser(session.userId, {
      fullName,
      displayName,
    });

    await createAuditLog({
      action: "COMPLETE_ONBOARDING",
      targetType: "USER",
      targetId: session.userId,
      metadata: { fullName, displayName },
    });

    // Revalidate relevant paths
    revalidatePath("/profile");
    revalidatePath("/dashboard");

    return { success: true, data: null };
  } catch (error) {
    return handleActionError(error);
  }
}
