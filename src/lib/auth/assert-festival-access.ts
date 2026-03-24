import type { SessionPayload } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
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

  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
  });

  if (!festival) {
    throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
  }

  const isOwner = festival.ownerId === session.userId;

  let isMember = false;
  if (!isSuperAdmin && !isOwner) {
    const member = await prisma.festivalMember.findUnique({
      where: {
        festivalId_userId: {
          festivalId,
          userId: session.userId,
        },
      },
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
