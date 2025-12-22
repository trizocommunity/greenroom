import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { User } from "@prisma/client";

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session || !session.userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  return user;
}
