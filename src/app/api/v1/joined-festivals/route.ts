import "server-only";

import { and, eq } from "drizzle-orm";
import { createProtectedHandler, ok } from "@/api/lib";
import { db } from "@/core/database/client";
import { festival, festivalMember } from "@/core/database/schema";

const handler = createProtectedHandler({
  async GET({ user }) {
    const memberships = await db
      .select({
        festival,
        memberRole: festivalMember.role,
        memberSince: festivalMember.createdAt,
      })
      .from(festivalMember)
      .innerJoin(festival, eq(festival.id, festivalMember.festivalId))
      .where(
        and(
          eq(festivalMember.userId, user!.userId),
          eq(festivalMember.isActive, true),
        ),
      );

    const joinedFestivals = memberships.map((m) => ({
      ...m.festival,
      memberRole: m.memberRole,
      memberSince: m.memberSince,
    }));

    return ok(joinedFestivals);
  },
});

export const GET = handler;
