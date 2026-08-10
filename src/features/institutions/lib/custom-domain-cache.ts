type CacheValue = { institutionId: string } | null;

type CacheEntry = {
  expiresAt: number;
  value: CacheValue;
};

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export function getCustomDomainCacheTtlMs(): number {
  return TTL_MS;
}

/** Returns undefined on miss; null means negative cache (unknown/unverified). */
export function getCachedVerifiedInstitution(
  customDomain: string,
): CacheValue | undefined {
  const key = customDomain.toLowerCase();
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

export function setCachedVerifiedInstitution(
  customDomain: string,
  value: CacheValue,
): void {
  cache.set(customDomain.toLowerCase(), {
    expiresAt: Date.now() + TTL_MS,
    value,
  });
}

/** Invalidate one apex or clear the whole map when domain is omitted. */
export function invalidateCustomDomainCache(
  customDomain?: string | null,
): void {
  if (!customDomain) {
    cache.clear();
    return;
  }
  cache.delete(customDomain.toLowerCase());
}

/** Test helper — wipe cache between unit tests. */
export function __resetCustomDomainCacheForTests(): void {
  cache.clear();
}
