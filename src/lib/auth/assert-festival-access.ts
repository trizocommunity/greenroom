import type { SessionPayload } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";

/**
 * Asserts the current user has access to the festival (owner, active member, or SUPER_ADMIN).
 * Call at the start of any server action that takes festivalId.
 * @throws AppError UNAUTHORIZED if no session, NOT_FOUND if festival missing, FORBIDDEN if no access
 */
export async function assertFestivalAccess(
  session: SessionPayload | null,
  festivalId: string,
): Promise<void> {
  if (!session?.userId) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }

  if (session.role === "SUPER_ADMIN") {
    return;
  }

  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
  });

  if (!festival) {
    throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
  }

  if (festival.ownerId === session.userId) {
    return;
  }

  const member = await prisma.festivalMember.findUnique({
    where: {
      festivalId_userId: {
        festivalId,
        userId: session.userId,
      },
    },
  });

  if (member?.isActive) {
    return;
  }

  throw new AppError(ERROR_MESSAGES.FORBIDDEN);
}
