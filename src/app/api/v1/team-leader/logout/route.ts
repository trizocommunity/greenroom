import "server-only";

import { cookies } from "next/headers";
import { createProtectedHandler, forbidden, ok } from "@/api/lib";
import {
  clearTeamLeaderSessionCookie,
  getTokenHash,
  TEAM_LEADER_SESSION_COOKIE,
} from "@/core/auth/team-leader-session";
import { db } from "@/core/database/client";
import { teamLeaderSession as sessionTable } from "@/core/database/schema";
import { and, eq, isNull } from "drizzle-orm";

const handler = createProtectedHandler({
  async POST({ user }) {
    if (!user) return forbidden("Authentication required");

    const cookieStore = await cookies();
    const rawToken = cookieStore.get(TEAM_LEADER_SESSION_COOKIE)?.value;

    if (rawToken) {
      const tokenHash = getTokenHash(rawToken);
      const now = new Date().toISOString();
      await db
        .update(sessionTable)
        .set({
          revokedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(sessionTable.tokenHash, tokenHash),
            isNull(sessionTable.revokedAt),
          ),
        );
    }

    await clearTeamLeaderSessionCookie();

    return ok({ success: true });
  },
});

export const POST = handler;
