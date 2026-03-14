import type { FestivalRole, GlobalRole } from "@prisma/client";
import { TIER_CONFIG } from "@/config/pricing";
import { getResolvedTier } from "@/lib/tier";
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
  /** True when plan allows readonly access within dataRetentionDays after expiry (e.g. STANDARD). */
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

  let readOnlyExpired = false;
  if (isExpired && festival.expiresAt) {
    const tier = getResolvedTier(festival.tier);
    const config = TIER_CONFIG[tier];
    const postExpiryAccess = config?.features?.postExpiryAccess;
    const dataRetentionDays = config?.features?.dataRetentionDays ?? 0;
    if (postExpiryAccess === "readonly" && dataRetentionDays > 0) {
      const retentionEnd = new Date(festival.expiresAt);
      retentionEnd.setDate(retentionEnd.getDate() + dataRetentionDays);
      if (now <= retentionEnd) {
        readOnlyExpired = true;
      }
    }
  }

  return {
    festival,
    role,
    isExpired,
    readOnlyExpired,
  };
}

/** Throws if the festival is in post-expiry readonly window (e.g. STANDARD 30 days). Call from mutation actions. */
export async function ensureFestivalWritable(festivalId: string): Promise<void> {
  const festival = await findFestivalBySlugOrId(festivalId);
  if (!festival) return;
  const now = new Date();
  const isExpired = Boolean(
    festival.status === "EXPIRED" ||
      (festival.expiresAt && new Date(festival.expiresAt) < now),
  );
  if (!isExpired) return;
  if (!festival.expiresAt) return;
  const tier = getResolvedTier(festival.tier);
  const config = TIER_CONFIG[tier];
  const postExpiryAccess = config?.features?.postExpiryAccess;
  const dataRetentionDays = config?.features?.dataRetentionDays ?? 0;
  if (postExpiryAccess !== "readonly" || dataRetentionDays <= 0) return;
  const retentionEnd = new Date(festival.expiresAt);
  retentionEnd.setDate(retentionEnd.getDate() + dataRetentionDays);
  if (now > retentionEnd) return;
  throw new Error(
    "This festival has expired and is in read-only mode. Create, edit, and delete are disabled.",
  );
}

