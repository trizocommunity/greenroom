"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession, updateSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  age: z.coerce
    .number()
    .min(13, "You must be at least 13 years old")
    .max(120, "Invalid age"),
});

export async function updateProfile(data: z.infer<typeof profileSchema>) {
  const session = await getSession();

  if (!session?.userId) {
    return { error: "Not authenticated" };
  }

  const result = profileSchema.safeParse(data);

  if (!result.success) {
    return {
      error: "Invalid input data",
      fields: result.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        fullName: result.data.fullName,
        displayName: result.data.displayName,
        age: result.data.age,
      },
    });

    revalidatePath("/profile");

    return { success: true };
  } catch (error) {
    console.error("Profile update error:", error);
    return { error: "Failed to update profile" };
  }
}
