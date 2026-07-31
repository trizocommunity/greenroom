import { and, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { withDbRetry } from "@/core/database/db-retry";
import { festivalMember, festival as festivals } from "@/core/database/schema";
import { isExpired } from "@/core/datetime";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { findFestivalBySlugOrId } from "@/features/festivals/repositories/festival.repository";
import { getDerivedFestivalStatus } from "@/features/festivals/services/festival-status.service";

export type FestivalRole = "ADMIN" | "ANNOUNCER" | "STAGE_MANAGER" | "MEDIA";
export type FestivalAccessRole =
  | "SUPER_ADMIN"
  | "OWNER"
  | FestivalRole
  | "NONE";

export interface FestivalContext {
  festival: NonNullable<Awaited<ReturnType<typeof findFestivalBySlugOrId>>>;
  role: FestivalAccessRole;
  isExpired: boolean;
  /** Kept for backward compat; always false (no read-only after expiry). */
  readOnlyExpired?: boolean;
}

interface GetFestivalContextOptions {
  slugOrId: string;
  userId: string | null | undefined;
  globalRole: string | null | undefined;
}

export async function getFestivalContext(
  options: GetFestivalContextOptions,
): Promise<FestivalContext | null> {
  const { slugOrId, userId, globalRole } = options;

  const festival = await findFestivalBySlugOrId(slugOrId);
  if (!festival) return null;

  const isCreator = !!userId && festival.ownerId === userId;
  const isSuperAdmin = globalRole === "SUPER_ADMIN";

  let role: FestivalAccessRole = isSuperAdmin
    ? "SUPER_ADMIN"
    : isCreator
      ? "OWNER"
      : "NONE";

  if (!isCreator && !isSuperAdmin && userId) {
    const member = await withDbRetry(() =>
      db.query.festivalMember.findFirst({
        where: and(
          eq(festivalMember.festivalId, festival.id),
          eq(festivalMember.userId, userId),
        ),
      }),
    );

    if (member?.isActive) {
      role = member.role as FestivalRole;
    }
  }

  const expired =
    festival.status === "EXPIRED" || isExpired(festival.expiresAt);

  const readOnlyExpired = false;

  return {
    festival,
    role,
    isExpired: expired,
    readOnlyExpired,
  };
}

/** Throws if the festival is expired. No read-only window; expired = full lock. Call from mutation actions. */
export async function ensureFestivalWritable(
  festivalId: string,
): Promise<void> {
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
  if (!festival) return;
  const status = getDerivedFestivalStatus(festival);
  if (status === "EXPIRED") {
    throw new AppError(ERROR_MESSAGES.FESTIVAL_EXPIRED);
  }
  if (status === "PAST") {
    throw new AppError(ERROR_MESSAGES.FESTIVAL_PAST_READONLY);
  }
}
