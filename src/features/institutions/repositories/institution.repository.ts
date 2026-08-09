import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/core/database/client";
import { institution } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import {
  getCachedVerifiedInstitution,
  invalidateCustomDomainCache,
  setCachedVerifiedInstitution,
} from "@/features/institutions/lib/custom-domain-cache";
import { normalizeCustomDomain } from "@/features/institutions/lib/custom-domain";

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

export async function updateInstitutionCustomDomain(opts: {
  institutionId: string;
  customDomain: string | null;
}): Promise<typeof institution.$inferSelect> {
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
      updatedAt: serverNowIso(),
    })
    .where(eq(institution.id, opts.institutionId))
    .returning();

  if (previousDomain) invalidateCustomDomainCache(previousDomain);
  if (nextDomain) invalidateCustomDomainCache(nextDomain);

  return updated;
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

export async function clearInstitutionDomainVerification(
  institutionId: string,
): Promise<void> {
  const existing = await findInstitutionById(institutionId);
  if (!existing) return;

  await db
    .update(institution)
    .set({
      verifiedAt: null,
      updatedAt: serverNowIso(),
    })
    .where(eq(institution.id, institutionId));

  if (existing.customDomain) {
    invalidateCustomDomainCache(existing.customDomain);
  }
}
