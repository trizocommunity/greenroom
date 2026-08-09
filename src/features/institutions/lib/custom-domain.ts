import { getAppBaseUrl } from "@/config/routes";

/** Vercel DNS CNAME target for custom domains (Phase 1 manual attach). */
export const VERCEL_DNS_CNAME_TARGET = "cname.vercel-dns.com";

const APP_HOST_EXTRAS = ["localhost", "127.0.0.1", "greenroomm.vercel.app"];

/**
 * Hostnames that serve the Greenroom app itself (not institution custom domains).
 */
export function getAppHosts(): Set<string> {
  const hosts = new Set<string>(
    APP_HOST_EXTRAS.map((h) => h.toLowerCase()),
  );

  try {
    const base = getAppBaseUrl();
    hosts.add(new URL(base).hostname.toLowerCase());
  } catch {
    // ignore invalid base URL
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    hosts.add(
      vercel
        .replace(/^https?:\/\//, "")
        .split("/")[0]
        .toLowerCase(),
    );
  }

  return hosts;
}

/** Lowercase apex without trailing dot or scheme. */
export function normalizeCustomDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

/** Basic hostname shape: labels, no spaces, at least one dot. */
export function isValidCustomDomainShape(domain: string): boolean {
  const normalized = normalizeCustomDomain(domain);
  if (!normalized || normalized.includes("..")) return false;
  if (normalized.length > 253) return false;
  // Reject IPs and single-label hosts
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) return false;
  const labels = normalized.split(".");
  if (labels.length < 2) return false;
  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label),
  );
}

/**
 * Parse `{festivalSlug}.{customDomain}` from a Host header.
 * Returns null for app hosts, apex-only, or malformed hosts.
 */
export function parseCustomFestivalHost(
  hostHeader: string,
  appHosts: Set<string> = getAppHosts(),
): { festivalSlug: string; customDomain: string } | null {
  const hostname = hostHeader.split(":")[0]?.toLowerCase().trim();
  if (!hostname) return null;
  if (appHosts.has(hostname)) return null;

  const labels = hostname.split(".");
  // Need at least slug + apex (2+ labels for apex means 3+ total)
  if (labels.length < 3) return null;

  const festivalSlug = labels[0];
  if (!festivalSlug || festivalSlug === "www") return null;

  const customDomain = labels.slice(1).join(".");
  if (!isValidCustomDomainShape(customDomain)) return null;

  return { festivalSlug, customDomain };
}

export type InstitutionDomainFields = {
  customDomain: string | null;
  verifiedAt: string | Date | null;
};

/**
 * Public base URL for a festival: branded subdomain when verified, else path on app.
 */
export function getPublicFestivalBaseUrl(opts: {
  slug: string;
  institution?: InstitutionDomainFields | null;
}): string {
  const slug = opts.slug.trim();
  const domain = opts.institution?.customDomain
    ? normalizeCustomDomain(opts.institution.customDomain)
    : null;
  const verified = !!opts.institution?.verifiedAt && !!domain;

  if (verified && domain) {
    return `https://${slug}.${domain}`;
  }

  return `${getAppBaseUrl()}/${slug}`;
}

/** TXT ownership value for `_greenroom.{domain}`. */
export function getDomainOwnershipToken(institutionId: string): string {
  return `greenroom-verify=${institutionId}`;
}

/** DNS name for the ownership TXT record. */
export function getDomainOwnershipTxtName(customDomain: string): string {
  return `_greenroom.${normalizeCustomDomain(customDomain)}`;
}

/** First path segment that is never a festival slug on the app host. */
export const RESERVED_APP_PATH_SEGMENTS = new Set([
  "api",
  "_next",
  "dashboard",
  "profile",
  "login",
  "invite",
  "super-admin",
  "about",
  "features",
  "services",
  "contact",
  "pricing",
  "auth",
  "manifest.webmanifest",
  "sw.js",
  "icons",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

/**
 * Extract festival slug from an app-host pathname like `/{slug}/login`.
 * Returns null for reserved / non-festival paths.
 */
export function extractFestivalSlugFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  const first = segments[0].toLowerCase();
  if (RESERVED_APP_PATH_SEGMENTS.has(first)) return null;
  return segments[0];
}

/** Paths under a festival slug that should canonicalize to the branded host. */
export function isPublicFestivalSurfacePath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  if (RESERVED_APP_PATH_SEGMENTS.has(segments[0].toLowerCase())) return false;
  // /{slug} and any nested public/portal path (not dashboard — already reserved)
  return true;
}
