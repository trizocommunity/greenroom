import "server-only";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import type { BooleanFeaturePath } from "@/features/plan-features/services/feature-gate";
import { isEnabled } from "@/features/plan-features/services/feature-gate";
import { loadFeatureOverrides } from "@/features/plan-features/services/plan-features.service";
import { getResolvedTier } from "@/features/plan-features/services/tier";

type Festival = NonNullable<Awaited<ReturnType<typeof findFestivalBySlug>>>;

export type PublicAccessResult =
  | { ok: true; festival: Festival }
  | { ok: false; reason: "not-found" | "closed" | "feature-disabled" };

/**
 * The gate every public festival API route runs first.
 *
 * These endpoints are unauthenticated, so they must reproduce the same three
 * checks the server-rendered pages already make — the festival exists, its
 * public site is switched on and unexpired, and the requested section is
 * included in its plan. Everything failing collapses to `not-found` at the
 * route layer so the API never reveals that a private festival exists.
 */
export async function resolvePublicFestival(
  slug: string,
  feature?: BooleanFeaturePath,
): Promise<PublicAccessResult> {
  const festival = await findFestivalBySlug(slug);
  if (!festival) return { ok: false, reason: "not-found" };

  const isExpired =
    festival.status === "EXPIRED" ||
    (festival.expiresAt && new Date(festival.expiresAt) < new Date());

  if (isExpired || !festival.publicSiteEnabled) {
    return { ok: false, reason: "closed" };
  }

  if (feature) {
    const effectiveFeatures = await loadFeatureOverrides(
      getResolvedTier(festival.tier),
    );
    const enabled = isEnabled(festival.tier, feature, effectiveFeatures);
    if (!enabled) return { ok: false, reason: "feature-disabled" };
  }

  return { ok: true, festival };
}

/** Reads `page` / `pageSize` off a request URL, clamped to sane bounds. */
export function readPageParams(
  request: Request,
  defaults: { pageSize: number; maxPageSize: number },
): { page: number; pageSize: number } {
  const url = new URL(request.url);

  const rawPage = Number(url.searchParams.get("page"));
  const page =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.trunc(rawPage) : 1;

  const rawSize = Number(url.searchParams.get("pageSize"));
  const pageSize =
    Number.isFinite(rawSize) && rawSize >= 1
      ? Math.min(defaults.maxPageSize, Math.trunc(rawSize))
      : defaults.pageSize;

  return { page, pageSize };
}

/**
 * Public reads are cacheable but must not go stale for long — results and
 * news change during a live festival.
 */
export const PUBLIC_CACHE_CONTROL =
  "public, s-maxage=30, stale-while-revalidate=120";
