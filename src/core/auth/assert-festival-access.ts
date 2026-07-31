import { and, eq } from "drizzle-orm";
import type { SessionPayload } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  festivalMember as festivalMemberTable,
  festival as festivalTable,
} from "@/core/database/schema";
import { MS, nowPlus, serverNowMs } from "@/core/datetime/server";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { assertFestivalMutationAllowed } from "@/features/festivals/services/festival-lifecycle-policy.service";

type AccessLevel = "owner" | "member" | "super_admin" | "none";

interface CacheEntry {
  access: AccessLevel;
  expiresAt: number;
}

const accessCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = MS.minute;

function getCacheKey(festivalId: string, userId: string, role: string): string {
  return `${festivalId}:${userId}:${role}`;
}

function getFromCache(key: string): AccessLevel | null {
  const entry = accessCache.get(key);
  if (!entry) return null;
  if (serverNowMs() > entry.expiresAt) {
    accessCache.delete(key);
    return null;
  }
  return entry.access;
}

function setToCache(key: string, access: AccessLevel): void {
  accessCache.set(key, { access, expiresAt: nowPlus(CACHE_TTL_MS).getTime() });
}

export async function assertFestivalAccess(
  session: SessionPayload | null,
  festivalId: string,
  options?: { requireWritable?: boolean; allowPast?: boolean },
): Promise<void> {
  if (!session?.userId) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }

  const isSuperAdmin = session.role === "SUPER_ADMIN";
  const cacheKey = getCacheKey(festivalId, session.userId, session.role);

  const cachedAccess = getFromCache(cacheKey);
  if (cachedAccess) {
    if (cachedAccess === "none") {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }
    if (options?.requireWritable) {
      await assertFestivalMutationAllowed(festivalId, {
        allowPast: options.allowPast,
      });
    }
    return;
  }

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

  let access: AccessLevel;
  if (isSuperAdmin) {
    access = "super_admin";
  } else if (isOwner) {
    access = "owner";
  } else if (isMember) {
    access = "member";
  } else {
    access = "none";
  }

  setToCache(cacheKey, access);

  if (access === "none") {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }

  if (options?.requireWritable) {
    await assertFestivalMutationAllowed(festivalId, {
      allowPast: options.allowPast,
    });
  }
}
