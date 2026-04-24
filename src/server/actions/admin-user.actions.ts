"use server";

import { revalidatePath } from "next/cache";
import { hashPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { user as userTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";

export async function resetUserPassword(userId: string, newPassword: string) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  try {
    const hashedPassword = await hashPassword(newPassword);

    await db.update(userTable).set({
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    }).where(eq(userTable.id, userId));

    revalidatePath("/super-admin/users");
    return { success: true };
  } catch (error) {
    console.error("Failed to reset password:", error);
    return { success: false, error: "Failed to reset password" };
  }
}
