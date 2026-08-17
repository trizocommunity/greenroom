import { randomUUID } from "crypto";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/core/database/client";
import { institution, type institutionType } from "@/core/database/schema";
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
 * An owner has at most one institution (`institution_ownerId_key`). The upgrade
 * path uses this to adopt an existing row instead of inserting a duplicate and
 * hitting the unique violation as a 500.
 */
export async function findInstitutionByOwnerId(
  ownerId: string,
  tx: Pick<typeof db, "query"> = db,
) {
  return tx.query.institution.findFirst({
    where: eq(institution.ownerId, ownerId),
  });
}

/**
 * Create the institution an owner brands their festivals under. Called from
 * institutional onboarding and from the personal → institutional upgrade.
 *
 * A custom domain is never set here: the owner adds one later from
 * Settings → Launch Website, once they have a PRO festival to serve under it.
 */
export async function createInstitution(
  data: {
    name: string;
    type: (typeof institutionType.enumValues)[number];
    affiliation?: string | null;
    city?: string | null;
    sizeRange?: string | null;
    ownerId: string;
  },
  tx: Pick<typeof db, "insert"> = db,
) {
  const [created] = await tx
    .insert(institution)
    .values({
      id: randomUUID(),
      name: data.name,
      type: data.type,
      affiliation: data.affiliation ?? null,
      city: data.city ?? null,
      sizeRange: data.sizeRange ?? null,
      ownerId: data.ownerId,
    })
    .returning();

  return created;
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

  const cached = await getCachedVerifiedInstitution(normalized);
  if (cached !== undefined) return cached;

  const row = await db.query.institution.findFirst({
    where: and(
      eq(institution.customDomain, normalized),
      isNotNull(institution.verifiedAt),
    ),
    columns: { id: true },
  });

  const value = row ? { institutionId: row.id } : null;
  await setCachedVerifiedInstitution(normalized, value);
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

  if (previousDomain) await invalidateCustomDomainCache(previousDomain);
  if (nextDomain) await invalidateCustomDomainCache(nextDomain);

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

  await invalidateCustomDomainCache(existing.customDomain);
  return updated;
}

/**
 * @deprecated Institution-wide TLS readiness assumed one wildcard certificate
 * covered every festival under the apex. Wildcards can only be validated over
 * DNS-01, which needs control of the institution's zone, so that certificate
 * never issued. Readiness is now proven per host — see
 * `markFestivalHttpsReady` in the festival repository.
 *
 * Nothing reads `institution.httpsReadyAt` anymore. Kept only so the column and
 * these helpers can be dropped together in a later migration.
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

  await invalidateCustomDomainCache(existing.customDomain);
  return updated;
}

/**
 * @deprecated Counterpart to `markInstitutionHttpsReady` — see that comment.
 * Use `clearFestivalHttpsReady` in the festival repository instead.
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
    await invalidateCustomDomainCache(existing.customDomain);
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
    await invalidateCustomDomainCache(existing.customDomain);
  }
}
