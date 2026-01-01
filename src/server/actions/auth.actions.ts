"use server";

import crypto from "crypto";
import type { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import {
  forgotPasswordSchema,
  loginSchema,
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
import type { ActionResponse } from "@/types/actions";

export async function loginAction(
  data: z.infer<typeof loginSchema>,
): Promise<ActionResponse<{ role: string }>> {
  try {
    const { email, password } = loginSchema.parse(data);

    const user = await findUserByEmail(email);

    if (!user || user.isActive === false) {
      throw new AppError("Invalid credentials or inactive account");
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      throw new AppError("Invalid credentials");
    }

    await createSession(user.id, user.globalRole);

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
): Promise<ActionResponse<any>> {
  try {
    const { email, password } = registerSchema.parse(data);

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      throw new AppError("This email is already registered.");
    }

    const hashedPassword = await hashPassword(password);

    const user = await createUser({
      email,
      password: hashedPassword,
    });

    // Create session for new user? Currently register route just returns user.
    // Usually auto-login is nice, but keeping behavior same as API route for now:
    // API route returns 201 and user. No session creation.

    const { password: _, ...userWithoutPassword } = user;

    return { success: true, data: userWithoutPassword };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function forgotPasswordAction(
  data: z.infer<typeof forgotPasswordSchema>,
): Promise<ActionResponse<any>> {
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
      user: { connect: { id: user.id } },
      token: tokenHash,
      expires: expiresAt,
    });

    // Mock Email sending
    // In a real app, sendEmail(user.email, resetUrl)
    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;

    return { success: true, data: null };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function resetPasswordAction(
  data: z.infer<typeof resetPasswordSchema>,
): Promise<ActionResponse<any>> {
  try {
    const { token, password } = resetPasswordSchema.parse(data);

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetTokenRecord = await findValidPasswordResetToken(tokenHash);

    if (!resetTokenRecord) {
      throw new AppError("Invalid or expired token.");
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
