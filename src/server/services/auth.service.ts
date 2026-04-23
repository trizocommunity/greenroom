import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { user as users } from "../db/schema";
import { eq } from "drizzle-orm";

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
