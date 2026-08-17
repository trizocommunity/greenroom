/**
 * Redis-backed rate limiter.
 *
 * Cross-instance correctness: every Vercel function hits the same counter,
 * so a user cannot bypass the limit by hitting a different serverless
 * instance. Fail-open on Redis outage — losing the limit briefly is better
 * than 503'ing every request during an incident.
 */

import { createHash } from "node:crypto";
import { MS, serverNowMs } from "@/core/datetime/server";
import { getRedis } from "@/core/redis/client";
import { keys } from "@/core/redis/keys";

/** sha1(ip)[:16] — short, deterministic, no raw PII in vendor dashboards. */
function hashIdentifier(identifier: string): string {
  return createHash("sha1").update(identifier).digest("hex").slice(0, 16);
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetTime: number;
};

export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 15 * MS.minute,
): Promise<RateLimitResult> {
  const now = serverNowMs();
  const resetTime = now + windowMs;
  const key = keys.rateLimit(hashIdentifier(identifier));

  try {
    // INCR + PEXPIRE NX in one pipeline. PEXPIRE ... NX (Redis 7+) sets the
    // TTL only on the first request of the window, so we never reset it
    // mid-window and never leave a key without a TTL.
    const results = (await getRedis()
      .multi()
      .incr(key)
      .pexpire(key, windowMs, "NX")
      .exec()) as Array<[Error | null, number]>;

    const count = results[0]?.[1] ?? 0;

    if (count > maxRequests) {
      return { allowed: false, remaining: 0, resetTime };
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - count),
      resetTime,
    };
  } catch (err) {
    console.warn(
      "[rate-limit] fail-open (Redis unavailable):",
      err instanceof Error ? err.message : err,
    );
    return { allowed: true, remaining: maxRequests, resetTime };
  }
}

export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return "unknown";
}
