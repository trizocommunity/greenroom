import { eq } from "drizzle-orm";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { user as users } from "@/core/database/schema";

export type User = typeof users.$inferSelect;

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session || !session.userId) {
    return null;
  }

  const user = await db.query.user.findFirst({
    where: eq(users.id, session.userId),
  });

  return user ?? null;
}
