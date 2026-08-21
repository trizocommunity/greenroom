import "server-only";

import { eq } from "drizzle-orm";
import { updateProfileInput } from "@/api/contracts/profile";
import { badRequest, createProtectedHandler, ok } from "@/api/lib";
import { db } from "@/core/database/client";
import { user as usersTable } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";

const handler = createProtectedHandler({
  async GET({ user: sessionUser }) {
    if (!sessionUser) {
      return badRequest("UNAUTHORIZED", "Not authenticated");
    }
    const dbUser = await db.query.user.findFirst({
      where: eq(usersTable.id, sessionUser.userId),
      with: { institution: true },
    });
    if (!dbUser) {
      return badRequest("NOT_FOUND", "User not found");
    }
    return ok(dbUser, "private, max-age=10");
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

    const updateData = { ...parsed.data };

    const [updated] = await db
      .update(usersTable)
      .set({
        ...updateData,
        updatedAt: serverNowIso(),
      })
      .where(eq(usersTable.id, sessionUser.userId))
      .returning();

    return ok(updated);
  },
});

export const GET = handler;
export const PUT = handler;
