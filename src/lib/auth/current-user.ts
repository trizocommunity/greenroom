import { cache } from "react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
  });
});
