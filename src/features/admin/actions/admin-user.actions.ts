"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { hashPassword } from "@/core/auth/password";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { user as userTable } from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";

export async function resetUserPassword(userId: string, newPassword: string) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  try {
    const hashedPassword = await hashPassword(newPassword);

    await db
      .update(userTable)
      .set({
        password: hashedPassword,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userTable.id, userId));

    revalidatePath("/super-admin/users");
    return { success: true };
  } catch (error) {
    console.error("Failed to reset password:", error);
    return { success: false, error: "Failed to reset password" };
  }
}
