import { and, eq } from "drizzle-orm";
import type { SessionPayload } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festivalMember as festivalMemberTable,
  festival as festivalTable,
} from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { assertFestivalMutationAllowed } from "@/features/festivals/services/festival-lifecycle-policy.service";

/**
 * Assert the current user has access to the festival.
 *
 * PR 3 dropped the in-memory cache that used to live here. With Better
 * Auth's session, role changes propagate immediately — there's no stale
 * up-to-60-second window to worry about, and the DB hit per request is
 * fast enough (one `festival` row + one optional `festivalMember` row,
 * both indexed) that caching it buys very little.
 *
 * Super-admins always pass. Owners always pass. Everyone else needs an
 * active `festivalMember` row.
 */
export async function assertFestivalAccess(
  session: SessionPayload | null,
  festivalId: string,
  options?: { requireWritable?: boolean; allowPast?: boolean },
): Promise<void> {
  if (!session?.userId) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }

  const isSuperAdmin = session.role === "SUPER_ADMIN";

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
  });

  if (!festival) {
    throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
  }

  const isOwner = festival.ownerId === session.userId;

  let isMember = false;
  if (!isSuperAdmin && !isOwner) {
    const member = await db.query.festivalMember.findFirst({
      where: and(
        eq(festivalMemberTable.festivalId, festivalId),
        eq(festivalMemberTable.userId, session.userId),
      ),
    });
    isMember = Boolean(member?.isActive);
  }

  const hasAccess = isSuperAdmin || isOwner || isMember;

  if (!hasAccess) {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  if (options?.requireWritable) {
    await assertFestivalMutationAllowed(festivalId, {
      allowPast: options.allowPast,
    });
  }
}
