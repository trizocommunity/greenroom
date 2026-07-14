import "server-only";

import { eq } from "drizzle-orm";
import { updateProfileInput } from "@/api/contracts/profile";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { db } from "@/core/database/client";
import { user as usersTable } from "@/core/database/schema";

const handler = createProtectedHandler({
  async GET({ user }) {
    if (!user) {
      return badRequest("UNAUTHORIZED", "Not authenticated");
    }
    return ok(user);
  },

  async PUT({ user: sessionUser, request }) {
    if (!sessionUser) {
      return badRequest("UNAUTHORIZED", "Not authenticated");
    }

    const body = await request.json();
    const data = body.data ?? body;
    const parsed = updateProfileInput.safeParse(data);

    if (!parsed.success) {
      return badRequest("INVALID_INPUT", parsed.error.message);
    }

    const [updated] = await db
      .update(usersTable)
      .set({
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(usersTable.id, sessionUser.userId))
      .returning();

    return ok(updated);
  },
});

export const GET = handler;
export const PUT = handler;
