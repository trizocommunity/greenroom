import { cache } from "react";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { user as userTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;

  return db.query.user.findFirst({
    where: eq(userTable.id, session.userId),
  });
});
