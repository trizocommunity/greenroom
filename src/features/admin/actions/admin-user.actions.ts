"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/core/auth/session";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";

export async function resetUserPassword(_userId: string) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  revalidatePath("/super-admin/users");
  return { success: true };
}
