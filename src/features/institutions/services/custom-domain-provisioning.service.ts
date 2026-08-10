import "server-only";

import {
  type CustomDomainStatus,
  normalizeCustomDomain,
} from "@/features/institutions/lib/custom-domain";
import {
  clearInstitutionHttpsReady,
  findInstitutionById,
  markInstitutionHttpsReady,
} from "@/features/institutions/repositories/institution.repository";
import {
  addWildcardDomainToProject,
  checkAttachStatus,
  isVercelDomainsConfigured,
  removeProjectDomain,
  type VercelAttachStatus,
} from "@/features/institutions/services/vercel-domains.service";

/**
 * Phase 2 orchestration: attach the wildcard on Vercel, prove HTTPS, and
 * persist `institution.httpsReadyAt`.
 *
 * Why a probe instead of trusting the Vercel API: a domain can report
 * `verified` + `misconfigured: false` while the certificate is still being
 * issued, and deployments without `VERCEL_TOKEN` (manual ops attach, per
 * Phase 1) have no API to ask at all. A successful TLS handshake against
 * `https://{probe}.{domain}` is the one signal that means the same thing in
 * both modes — and it is exactly what a visitor's browser does.
 */

/** Probing must not hang a route; TLS either answers quickly or it isn't ready. */
const PROBE_TIMEOUT_MS = 8_000;

function toIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Does `{slug}.{domain}` terminate TLS with a certificate our runtime accepts?
 *
 * Any HTTP response — including our own 404 for an unknown slug — proves the
 * handshake succeeded. Only transport/TLS failures count as not-ready.
 */
export async function probeHttpsReady(customDomain: string): Promise<boolean> {
  const domain = normalizeCustomDomain(customDomain);
  if (!domain) return false;

  // A label that is never a real festival slug: we want the TLS handshake,
  // not the page. The wildcard cert covers any single label.
  const probeHost = `_gr-tls-probe.${domain}`;

  try {
    await fetch(`https://${probeHost}/`, {
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
      return "Greenroom must attach the wildcard domain on Vercel before HTTPS works.";
    case "not-attached":
      return "Domain is not attached to the Vercel project yet.";
    case "pending-verification":
      return "Vercel is waiting on its own domain verification record.";
    case "misconfigured":
      return "Vercel reports the DNS for this domain is misconfigured.";
    case "error":
      return status.message;
    default:
      return undefined;
  }
}

/**
 * Attach `*.{domain}` on Vercel when automation is configured.
 * No-op (not an error) on manual deployments — ops attaches by hand.
 */
export async function ensureWildcardAttached(
  customDomain: string,
): Promise<VercelAttachStatus> {
  if (!isVercelDomainsConfigured()) return { status: "not-configured" };

  try {
    await addWildcardDomainToProject(customDomain);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Vercel attach failed";
    return { status: "error", message };
  }

  return await checkAttachStatus(customDomain);
}

/**
 * Detach a wildcard we no longer serve. Best-effort: a failure here leaves a
 * stale domain on the Vercel project but never blocks the user's domain change.
 */
export async function detachWildcard(customDomain: string): Promise<void> {
  if (!isVercelDomainsConfigured()) return;
  try {
    await removeProjectDomain(customDomain);
  } catch (err) {
    console.error(
      `Vercel wildcard detach failed for ${customDomain}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Resolve the current status for an institution and reconcile `httpsReadyAt`.
 *
 * Called on demand (verify, status polling) rather than on a schedule — the
 * only consumer that needs fresh state is the owner watching the screen.
 */
export async function syncCustomDomainStatus(
  institutionId: string,
): Promise<CustomDomainStatus> {
  const institution = await findInstitutionById(institutionId);

  if (!institution) {
    return {
      phase: "error",
      customDomain: null,
      verifiedAt: null,
      httpsReadyAt: null,
      detail: "Institution not found",
    };
  }

  const customDomain = institution.customDomain ?? null;
  const verifiedAt = toIso(institution.verifiedAt);
  let httpsReadyAt = toIso(institution.httpsReadyAt);

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

  // DNS is verified — the remaining question is whether HTTPS actually serves.
  const httpsReady = await probeHttpsReady(customDomain);

  if (httpsReady && !httpsReadyAt) {
    const updated = await markInstitutionHttpsReady(institutionId);
    httpsReadyAt = toIso(updated.httpsReadyAt);
  } else if (!httpsReady && httpsReadyAt) {
    // Certificate stopped serving (domain removed, DNS moved) — stop
    // advertising branded URLs until it comes back.
    await clearInstitutionHttpsReady(institutionId);
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

  const attach = await checkAttachStatus(customDomain);

  return {
    phase:
      attach.status === "not-configured" ? "manual-attach" : "provisioning",
    customDomain,
    verifiedAt,
    httpsReadyAt: null,
    detail: detailForAttach(attach),
  };
}
