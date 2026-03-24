import { getDerivedFestivalStatus } from "@/lib/festival-status";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";

export type FestivalLifecyclePolicyStatus = "READY" | "ONGOING" | "PAST" | "EXPIRED";

export async function getFestivalLifecyclePolicyStatus(
  festivalId: string,
): Promise<FestivalLifecyclePolicyStatus> {
  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    select: {
      status: true,
      startDate: true,
      endDate: true,
      expiresAt: true,
    },
  });
  if (!festival) {
    throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);
  }
  return getDerivedFestivalStatus(festival);
}

export async function assertFestivalMutationAllowed(
  festivalId: string,
  options?: { allowPast?: boolean },
): Promise<void> {
  const status = await getFestivalLifecyclePolicyStatus(festivalId);
  if (status === "EXPIRED") {
    throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);
  }
  if (status === "PAST" && !options?.allowPast) {
    throw new AppError(ERROR_MESSAGES.FESTIVAL_PAST_READONLY);
  }
}

