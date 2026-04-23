import { db } from "@/lib/db";
import { festival as festivals } from "../db/schema";
import { AppError, ERROR_MESSAGES } from "@/lib/errors";
import { getDerivedFestivalStatus } from "@/lib/festival-status";
import { eq } from "drizzle-orm";

export type FestivalLifecyclePolicyStatus =
  | "READY"
  | "ONGOING"
  | "PAST"
  | "EXPIRED";

export async function getFestivalLifecyclePolicyStatus(
  festivalId: string,
): Promise<FestivalLifecyclePolicyStatus> {
  const result = await db
    .select({ status: festivals.status, startDate: festivals.startDate, endDate: festivals.endDate, expiresAt: festivals.expiresAt })
    .from(festivals)
    .where(eq(festivals.id, festivalId))
    .limit(1);

  const festival = result[0];
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
