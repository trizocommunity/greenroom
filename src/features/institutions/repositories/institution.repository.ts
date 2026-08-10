import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/core/database/client";
import { institution } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { normalizeCustomDomain } from "@/features/institutions/lib/custom-domain";
import {
  getCachedVerifiedInstitution,
  invalidateCustomDomainCache,
  setCachedVerifiedInstitution,
} from "@/features/institutions/lib/custom-domain-cache";

export { invalidateCustomDomainCache };

export async function findInstitutionById(id: string) {
  return db.query.institution.findFirst({
    where: eq(institution.id, id),
  });
}

/**
 * Cached lookup: apex → verified institution id (or null if missing/unverified).
 * TTL 60s; call invalidateCustomDomainCache on save/verify/clear.
 */
export async function findVerifiedInstitutionByCustomDomain(
  customDomain: string,
): Promise<{ institutionId: string } | null> {
  const normalized = normalizeCustomDomain(customDomain);
  if (!normalized) return null;

  const cached = getCachedVerifiedInstitution(normalized);
  if (cached !== undefined) return cached;

  const row = await db.query.institution.findFirst({
    where: and(
      eq(institution.customDomain, normalized),
      isNotNull(institution.verifiedAt),
    ),
    columns: { id: true },
  });

  const value = row ? { institutionId: row.id } : null;
  setCachedVerifiedInstitution(normalized, value);
  return value;
}

/**
 * Persist a domain change. Returns the previous domain so callers can detach
 * it on Vercel — the repository stays free of network side effects (it is
 * imported by `src/proxy.ts`, which must not bundle an HTTP client).
 */
export async function updateInstitutionCustomDomain(opts: {
  institutionId: string;
  customDomain: string | null;
}): Promise<{
  institution: typeof institution.$inferSelect;
  previousDomain: string | null;
}> {
  const existing = await findInstitutionById(opts.institutionId);
  if (!existing) {
    throw new Error("Institution not found");
  }

  const previousDomain = existing.customDomain;
  const nextDomain = opts.customDomain
    ? normalizeCustomDomain(opts.customDomain)
    : null;

  const [updated] = await db
    .update(institution)
    .set({
      customDomain: nextDomain,
      // Domain change/clear always drops verification (grilled decision A).
      verifiedAt: null,
      // Phase 2: TLS readiness is also invalidated on domain change.
      httpsReadyAt: null,
      updatedAt: serverNowIso(),
    })
    .where(eq(institution.id, opts.institutionId))
    .returning();

  if (previousDomain) invalidateCustomDomainCache(previousDomain);
  if (nextDomain) invalidateCustomDomainCache(nextDomain);

  return {
    institution: updated,
    previousDomain:
      previousDomain && previousDomain !== nextDomain ? previousDomain : null,
  };
}

export async function markInstitutionDomainVerified(
  institutionId: string,
): Promise<typeof institution.$inferSelect> {
  const existing = await findInstitutionById(institutionId);
  if (!existing?.customDomain) {
    throw new Error("Institution has no custom domain");
  }

  const [updated] = await db
    .update(institution)
    .set({
      verifiedAt: serverNowIso(),
      updatedAt: serverNowIso(),
    })
    .where(eq(institution.id, institutionId))
    .returning();

  invalidateCustomDomainCache(existing.customDomain);
  return updated;
}

/**
 * Phase 2: mark TLS as ready after Vercel confirms the wildcard cert is good.
 */
export async function markInstitutionHttpsReady(
  institutionId: string,
): Promise<typeof institution.$inferSelect> {
  const existing = await findInstitutionById(institutionId);
  if (!existing?.customDomain) {
    throw new Error("Institution has no custom domain");
  }

  const [updated] = await db
    .update(institution)
    .set({
      httpsReadyAt: serverNowIso(),
      updatedAt: serverNowIso(),
    })
    .where(eq(institution.id, institutionId))
    .returning();

  invalidateCustomDomainCache(existing.customDomain);
  return updated;
}

/**
 * Phase 2: clear TLS readiness (e.g. after Vercel status changes to not-ready).
 */
export async function clearInstitutionHttpsReady(
  institutionId: string,
): Promise<void> {
  const existing = await findInstitutionById(institutionId);
  if (!existing) return;

  await db
    .update(institution)
    .set({
      httpsReadyAt: null,
      updatedAt: serverNowIso(),
    })
    .where(eq(institution.id, institutionId));

  if (existing.customDomain) {
    invalidateCustomDomainCache(existing.customDomain);
  }
}

export async function clearInstitutionDomainVerification(
  institutionId: string,
): Promise<void> {
  const existing = await findInstitutionById(institutionId);
  if (!existing) return;

  await db
    .update(institution)
    .set({
      verifiedAt: null,
      httpsReadyAt: null,
      updatedAt: serverNowIso(),
    })
    .where(eq(institution.id, institutionId));

  if (existing.customDomain) {
    invalidateCustomDomainCache(existing.customDomain);
  }
}
