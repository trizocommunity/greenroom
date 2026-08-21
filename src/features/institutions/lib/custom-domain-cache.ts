import "server-only";
import { cache } from "@/core/cache/instance";
import { getRedis } from "@/core/redis/client";
import { keys } from "@/core/redis/keys";

type CacheValue = { institutionId: string } | null;

/** TTL for a verified apex hit (positive cache). */
const POSITIVE_TTL_MS = 60_000;
/** Shorter TTL for "no verified institution here" (negative cache). */
const NEGATIVE_TTL_MS = 30_000;

export function getCustomDomainPositiveTtlMs(): number {
  return POSITIVE_TTL_MS;
}

/** Returns undefined on miss; null means negative cache (unknown/unverified). */
export async function getCachedVerifiedInstitution(
  customDomain: string,
): Promise<CacheValue | undefined> {
  const normalized = customDomain.toLowerCase();
  return cache.get<CacheValue>(keys.domainHost(normalized));
}

export async function setCachedVerifiedInstitution(
  customDomain: string,
  value: CacheValue,
): Promise<void> {
  const ttlMs = value === null ? NEGATIVE_TTL_MS : POSITIVE_TTL_MS;
  await cache.set(keys.domainHost(customDomain.toLowerCase()), value, {
    ttlMs,
  });
}

/** Invalidate one apex or wipe every `greenroom:domain:*` key when omitted. */
export async function invalidateCustomDomainCache(
  customDomain?: string | null,
): Promise<void> {
  if (!customDomain) {
    // Pattern-delete is the only way to clear every cached apex without
    // tracking membership. Bounded: keys live under one prefix and the set
    // is small (one entry per verified institution).
    const redis = getRedis();
    const stream = redis.scanStream({ match: `${keys.domainHost("")}*` });
    const pipeline = redis.pipeline();
    let buffered = 0;
    for await (const keysBatch of stream) {
      for (const k of keysBatch) {
        pipeline.del(k);
        buffered += 1;
      }
    }
    if (buffered > 0) await pipeline.exec();
    return;
  }
  await cache.del(keys.domainHost(customDomain.toLowerCase()));
}

/** Test helper — wipe every cached apex between unit tests. */
export async function __resetCustomDomainCacheForTests(): Promise<void> {
  await invalidateCustomDomainCache();
}
