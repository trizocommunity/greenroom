import type { FestivalRole, GlobalRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { findFestivalBySlugOrId } from "@/server/models/festival.model";

export type FestivalAccessRole =
  | "SUPER_ADMIN"
  | "OWNER"
  | FestivalRole
  | "NONE";

export interface FestivalContext {
  festival: NonNullable<
    Awaited<ReturnType<typeof findFestivalBySlugOrId>>
  >;
  role: FestivalAccessRole;
  isExpired: boolean;
  /** Kept for backward compat; always false (no read-only after expiry). */
  readOnlyExpired?: boolean;
}

interface GetFestivalContextOptions {
  slugOrId: string;
  userId: string | null | undefined;
  globalRole: GlobalRole | null | undefined;
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
    const member = await prisma.festivalMember.findUnique({
      where: {
        festivalId_userId: {
          festivalId: festival.id,
          userId,
        },
      },
    });

    if (member?.isActive) {
      role = member.role;
    }
  }

  const now = new Date();
  const isExpired = Boolean(
    festival.status === "EXPIRED" ||
      (festival.expiresAt && new Date(festival.expiresAt) < now),
  );

  // No read-only mode: all plans use fixed 30-day duration; once expired, full lock.
  const readOnlyExpired = false;

  return {
    festival,
    role,
    isExpired,
    readOnlyExpired,
  };
}

/** Throws if the festival is expired. No read-only window; expired = full lock. Call from mutation actions. */
export async function ensureFestivalWritable(festivalId: string): Promise<void> {
  const festival = await findFestivalBySlugOrId(festivalId);
  if (!festival) return;
  const now = new Date();
  const isExpired = Boolean(
    festival.status === "EXPIRED" ||
      (festival.expiresAt && new Date(festival.expiresAt) < now),
  );
  if (isExpired) {
    throw new Error(
      "This festival has expired. Create, edit, and delete are disabled.",
    );
  }
}

