import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/core/database/client";
import { user } from "@/core/database/schema";
import { isValidTimezone } from "@/core/datetime/user-tz";
import { getSession } from "@/core/auth/session";

/**
 * Return the current authenticated user's IANA timezone, or `null` when
 * there is no session, the user has no time-zone preference, or the
 * stored value is no longer recognised by the runtime.
 *
 * Cached per-request via a `Map` keyed by the user id so that multiple
 * calls in the same request share one DB round-trip.
 */
const cache = new Map<string, string | null>();

export async function getCurrentUserTimezone(): Promise<string | null> {
  const session = await getSession();
  if (!session?.userId) return null;
  if (cache.has(session.userId)) {
    return cache.get(session.userId) ?? null;
  }
  const rows = await db
    .select({ timezone: user.timezone })
    .from(user)
    .where(eq(user.id, session.userId))
    .limit(1);
  const tz = rows[0]?.timezone ?? null;
  const valid = tz && isValidTimezone(tz) ? tz : null;
  cache.set(session.userId, valid);
  return valid;
}

/**
 * Clear the in-memory user timezone cache. Hooks into auth events that
 * mutate the user's timezone (e.g. profile update) so the next request
 * reads fresh data.
 */
export function clearUserTimezoneCache(userId?: string): void {
  if (userId) {
    cache.delete(userId);
  } else {
    cache.clear();
  }
}
