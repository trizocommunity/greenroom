import "server-only";

import {
  clearFestivalHttpsReady,
  findFestivalById,
  findFestivalsForInstitution,
  markFestivalHttpsReady,
} from "@/features/festivals/repositories/festival.repository";
import {
  buildFestivalHost,
  type CustomDomainStatus,
} from "@/features/institutions/lib/custom-domain";
import { findInstitutionById } from "@/features/institutions/repositories/institution.repository";
import {
  addDomainToProject,
  checkAttachStatus,
  isVercelDomainsConfigured,
  removeProjectDomain,
  type VercelAttachStatus,
} from "@/features/institutions/services/vercel-domains.service";

/**
 * Orchestration: attach one festival host on Vercel, prove HTTPS, and persist
 * `festival.domainHttpsReadyAt`.
 *
 * Readiness is per festival, not per institution. Each host gets its own
 * certificate validated over HTTP-01, so `a.example.com` can be serving while
 * `b.example.com` has not been published yet. See vercel-domains.service for
 * why the wildcard certificate path was abandoned.
 *
 * Why a probe instead of trusting the Vercel API: a domain can report
 * `verified` + `misconfigured: false` while the certificate is still being
 * issued, and deployments without `VERCEL_TOKEN` (manual ops attach) have no
 * API to ask at all. A successful TLS handshake is the one signal that means
 * the same thing in both modes — and it is exactly what a visitor's browser does.
 */

/** Probing must not hang a route; TLS either answers quickly or it isn't ready. */
const PROBE_TIMEOUT_MS = 8_000;

function toIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Does `{slug}.{apex}` terminate TLS with a certificate our runtime accepts?
 *
 * Probes the real festival host rather than a sentinel label: with per-host
 * certificates there is no wildcard covering an arbitrary label, so a sentinel
 * would never have a certificate and would always report not-ready.
 *
 * Any HTTP response — including our own 404 — proves the handshake succeeded.
 * Only transport/TLS failures count as not-ready.
 */
export async function probeHttpsReady(
  slug: string,
  apex: string,
): Promise<boolean> {
  const host = buildFestivalHost(slug, apex);
  if (!host) return false;

  try {
    await fetch(`https://${host}/`, {
      method: "HEAD",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return true;
  } catch {
    // DNS failure, TLS error, timeout, or connection refused — not ready.
    return false;
  }
}

function detailForAttach(status: VercelAttachStatus): string | undefined {
  switch (status.status) {
    case "not-configured":
      return "Greenroom must attach this festival's address on Vercel before HTTPS works.";
    case "not-attached":
      return "This festival's address is not attached to the Vercel project yet.";
    case "pending-verification":
      // The records travel in CustomDomainStatus.vercelVerification so the owner
      // can act on them; this string only labels the state.
      return "One more DNS record is needed before the certificate can be issued.";
    case "misconfigured":
      return "Vercel reports the DNS for this address is misconfigured.";
    case "error":
      return status.message;
    default:
      return undefined;
  }
}

/**
 * Attach `{slug}.{apex}` on Vercel when automation is configured.
 * No-op (not an error) on manual deployments — ops attaches by hand.
 */
export async function ensureFestivalDomainAttached(
  slug: string,
  apex: string,
): Promise<VercelAttachStatus> {
  if (!isVercelDomainsConfigured()) return { status: "not-configured" };

  const host = buildFestivalHost(slug, apex);
  if (!host) return { status: "not-attached" };

  try {
    await addDomainToProject(host);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Vercel attach failed";
    return { status: "error", message };
  }

  return await checkAttachStatus(host);
}

/**
 * Detach a festival host we no longer serve. Best-effort: a failure here leaves
 * a stale domain on the Vercel project but never blocks the user's action.
 */
export async function detachFestivalDomain(
  slug: string,
  apex: string,
): Promise<void> {
  if (!isVercelDomainsConfigured()) return;

  const host = buildFestivalHost(slug, apex);
  if (!host) return;

  try {
    await removeProjectDomain(host);
  } catch (err) {
    console.error(
      `Vercel domain detach failed for ${host}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Make Vercel's domain list match reality for one festival: attached while it
 * serves a public site under a verified institution apex, detached otherwise.
 *
 * The single entry point for every lifecycle edge — publish, unpublish, delete.
 * Callers pass what the festival is *about to* become, and this resolves the
 * eligibility rules (institutional, plan allows custom domains, apex verified)
 * so they don't each re-derive them.
 *
 * Never throws and never blocks the caller's action: a festival that fails to
 * attach is still published, just on its path URL until the next status poll
 * retries. Detach must run *before* a delete, while the row still exists.
 */
export async function reconcileFestivalDomain(
  festivalId: string,
  shouldServe: boolean,
): Promise<void> {
  try {
    const festival = await findFestivalById(festivalId);
    if (!festival?.institutionId) return;

    const institution = await findInstitutionById(festival.institutionId);
    const apex = institution?.customDomain;
    if (!apex) return;

    const { isEnabled } = await import(
      "@/features/plan-features/services/feature-gate"
    );
    if (!isEnabled(festival.tier, "customDomain")) return;

    if (shouldServe) {
      // No verified apex yet means the host cannot resolve — the status route
      // attaches it once verification lands, so skipping here loses nothing.
      if (!institution.verifiedAt) return;
      await ensureFestivalDomainAttached(festival.slug, apex);
      return;
    }

    await detachFestivalDomain(festival.slug, apex);
    // The certificate is gone with the host; stop advertising the branded URL.
    await clearFestivalHttpsReady(festivalId);
  } catch (err) {
    console.error(
      `Festival domain reconcile failed for ${festivalId}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Attach a branded host for every festival already serving a public site under
 * this institution.
 *
 * Verifying an apex proves ownership once, but certificates are per host, so
 * verification on its own attaches nothing. This is what makes the moment of
 * verification useful: every published festival starts its certificate at once,
 * rather than each waiting for someone to open its settings screen.
 *
 * Best-effort per festival — one failure never stops the others, and the status
 * route retries anything missed.
 */
export async function attachPublishedFestivalsForInstitution(
  institutionId: string,
): Promise<void> {
  const institution = await findInstitutionById(institutionId);
  const apex = institution?.customDomain;
  if (!apex || !institution.verifiedAt) return;

  const festivals = await findFestivalsForInstitution(institutionId);
  const { isEnabled } = await import(
    "@/features/plan-features/services/feature-gate"
  );

  for (const festival of festivals) {
    if (!festival.publicSiteEnabled) continue;
    if (!isEnabled(festival.tier, "customDomain")) continue;
    await ensureFestivalDomainAttached(festival.slug, apex);
  }
}

/**
 * Release every branded host under an apex the institution no longer uses.
 *
 * Called when the apex is changed or cleared. Each festival had its own domain
 * on the Vercel project, so there is no single wildcard to drop — every host has
 * to be released individually or it sits on the project forever, blocking anyone
 * else from claiming that apex.
 *
 * Readiness is cleared alongside so the app stops advertising branded URLs that
 * no longer resolve.
 */
export async function detachAllFestivalsForApex(
  institutionId: string,
  apex: string,
): Promise<void> {
  const festivals = await findFestivalsForInstitution(institutionId);

  for (const festival of festivals) {
    await detachFestivalDomain(festival.slug, apex);
    if (festival.domainHttpsReadyAt) {
      await clearFestivalHttpsReady(festival.id);
    }
  }
}

/**
 * Move a festival's branded host after its slug changed.
 *
 * The host *is* the slug, so a rename orphans the old domain on Vercel and needs
 * a fresh certificate for the new one. Readiness is cleared unconditionally:
 * the old host's certificate says nothing about the new host, and advertising
 * the new branded URL before it serves would hand out a dead link.
 *
 * Call after the row is updated, with the slug it used to have.
 */
export async function handleFestivalSlugChange(
  festivalId: string,
  previousSlug: string,
): Promise<void> {
  let servesPublicSite = false;

  try {
    const festival = await findFestivalById(festivalId);
    if (!festival?.institutionId) return;
    servesPublicSite = festival.publicSiteEnabled;

    const institution = await findInstitutionById(festival.institutionId);
    const apex = institution?.customDomain;
    if (!apex) return;

    await clearFestivalHttpsReady(festivalId);
    await detachFestivalDomain(previousSlug, apex);
  } catch (err) {
    console.error(
      `Festival slug-change domain cleanup failed for ${festivalId}:`,
      err instanceof Error ? err.message : err,
    );
  }

  // Only re-attach if the festival was already serving publicly — a rename
  // should not publish anything that wasn't published before.
  if (servesPublicSite) {
    await reconcileFestivalDomain(festivalId, true);
  }
}

/**
 * Resolve the current status for one festival and reconcile its
 * `domainHttpsReadyAt`.
 *
 * Called on demand (verify, status polling) rather than on a schedule — the
 * only consumer that needs fresh state is the owner watching the screen.
 *
 * Attaches lazily: an already-published festival under a freshly verified apex
 * gets its host attached the first time this runs, so no backfill is needed.
 */
export async function syncFestivalDomainStatus(
  festivalId: string,
): Promise<CustomDomainStatus> {
  const festival = await findFestivalById(festivalId);

  if (!festival) {
    return {
      phase: "error",
      customDomain: null,
      verifiedAt: null,
      httpsReadyAt: null,
      detail: "Festival not found",
    };
  }

  const institution = festival.institutionId
    ? await findInstitutionById(festival.institutionId)
    : null;

  const customDomain = institution?.customDomain ?? null;
  const verifiedAt = toIso(institution?.verifiedAt);
  let httpsReadyAt = toIso(festival.domainHttpsReadyAt);

  if (!customDomain) {
    return {
      phase: "no-domain",
      customDomain: null,
      verifiedAt: null,
      httpsReadyAt: null,
    };
  }

  if (!verifiedAt) {
    return {
      phase: "awaiting-dns",
      customDomain,
      verifiedAt: null,
      httpsReadyAt: null,
      detail: "Publish the DNS records below, then verify.",
    };
  }

  // DNS is verified — the remaining question is whether HTTPS actually serves
  // for this festival's own host.
  const httpsReady = await probeHttpsReady(festival.slug, customDomain);

  if (httpsReady && !httpsReadyAt) {
    const updated = await markFestivalHttpsReady(festivalId);
    httpsReadyAt = toIso(updated?.domainHttpsReadyAt);
  } else if (!httpsReady && httpsReadyAt) {
    // Certificate stopped serving (host detached, DNS moved) — stop advertising
    // branded URLs until it comes back.
    await clearFestivalHttpsReady(festivalId);
    httpsReadyAt = null;
  }

  if (httpsReady) {
    return {
      phase: "https-ready",
      customDomain,
      verifiedAt,
      httpsReadyAt,
    };
  }

  // Not serving yet. A host is only attached once its festival is public, so
  // say that plainly rather than reporting a certificate that will never start.
  if (!festival.publicSiteEnabled) {
    return {
      phase: "provisioning",
      customDomain,
      verifiedAt,
      httpsReadyAt: null,
      detail:
        "Turn on this festival's public site to start its certificate. Its address is reserved.",
    };
  }

  // Attach on demand — this covers festivals published before the apex was
  // verified, and re-attaches anything dropped on Vercel's side.
  const attach = await ensureFestivalDomainAttached(
    festival.slug,
    customDomain,
  );

  return {
    phase:
      attach.status === "not-configured" ? "manual-attach" : "provisioning",
    customDomain,
    verifiedAt,
    httpsReadyAt: null,
    detail: detailForAttach(attach),
    // Vercel's own challenge, when it has one. Dropping these was why the
    // screen could sit on "provisioning" with nothing the owner could act on.
    vercelVerification:
      attach.status === "pending-verification"
        ? attach.records.map((record) => ({
            type: record.type.toUpperCase(),
            domain: record.domain,
            value: record.value,
          }))
        : undefined,
  };
}
