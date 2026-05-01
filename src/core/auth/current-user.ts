import { eq } from "drizzle-orm";
import { cache } from "react";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { user as userTable } from "@/core/database/schema";

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;

  return db.query.user.findFirst({
    where: eq(userTable.id, session.userId),
  });
});
