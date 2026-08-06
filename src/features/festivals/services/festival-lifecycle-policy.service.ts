import { eq, lt, ne } from "drizzle-orm";
import { db } from "@/core/database/client";
import { festival as festivals } from "@/core/database/schema";
import { isAfter, parseInstant } from "@/core/datetime";
import { MS, nowPlus, serverNow, serverNowIso } from "@/core/datetime/server";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { getDerivedFestivalStatus } from "@/features/festivals/services/festival-status.service";

export type FestivalLifecyclePolicyStatus =
  | "READY"
  | "ONGOING"
  | "PAST"
  | "EXPIRED";

/** Days before expiry at which warning notifications become visible/sent. */
export const PRE_ARCHIVAL_DAYS = 7;

export async function getFestivalLifecyclePolicyStatus(
  festivalId: string,
): Promise<FestivalLifecyclePolicyStatus> {
  const result = await db
    .select({
      status: festivals.status,
      startDate: festivals.startDate,
      endDate: festivals.endDate,
      expiresAt: festivals.expiresAt,
    })
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

export interface FestivalExpirySummary {
  id: string;
  name: string;
  slug: string;
  expiresAt: string | null;
}

/**
 * Find festivals within the warning window (expiring within the next N days).
 */
export async function getFestivalsApproachingExpiry(
  withinDays: number = PRE_ARCHIVAL_DAYS,
): Promise<FestivalExpirySummary[]> {
  const now = serverNow();
  const windowEnd = nowPlus(withinDays * MS.day);
  const list = await db
    .select({
      id: festivals.id,
      name: festivals.name,
      slug: festivals.slug,
      expiresAt: festivals.expiresAt,
    })
    .from(festivals)
    .where(ne(festivals.status, "EXPIRED"))
    .orderBy(festivals.expiresAt);

  return list.filter((f) => {
    if (!f.expiresAt || !f.slug) return false;
    const expiryDate = parseInstant(f.expiresAt);
    if (!expiryDate) return false;
    return isAfter(expiryDate, now) && !isAfter(expiryDate, windowEnd);
  });
}

/**
 * Find festivals that have passed expiresAt and are not yet marked EXPIRED.
 */
export async function getFestivalsToExpire(): Promise<
  Omit<FestivalExpirySummary, "expiresAt">[]
> {
  const now = serverNowIso();
  const list = await db
    .select({ id: festivals.id, name: festivals.name, slug: festivals.slug })
    .from(festivals)
    .where(lt(festivals.expiresAt, now));
  return list.filter((f) => f.slug !== null) as {
    id: string;
    name: string;
    slug: string;
  }[];
}
