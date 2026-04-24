import type { SessionPayload } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { festival as festivalTable, festivalMember as festivalMemberTable } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { assertFestivalMutationAllowed } from "@/server/services/festival-lifecycle-policy.service";

/**
 * Asserts the current user has access to the festival (owner, active member, or SUPER_ADMIN).
 * Call at the start of any server action that takes festivalId.
 * @throws AppError UNAUTHORIZED if no session, NOT_FOUND if festival missing, FORBIDDEN if no access
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
        eq(festivalMemberTable.userId, session.userId)
      ),
    });
    isMember = Boolean(member?.isActive);
  }

  if (!isSuperAdmin && !isOwner && !isMember) {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  if (options?.requireWritable) {
    await assertFestivalMutationAllowed(festivalId, {
      allowPast: options.allowPast,
    });
  }
}
