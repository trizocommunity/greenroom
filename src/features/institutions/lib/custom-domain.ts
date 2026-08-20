import { getAppBaseUrl } from "@/config/routes";

/** Vercel DNS CNAME target for custom domains (Phase 1 manual attach). */
export const VERCEL_DNS_CNAME_TARGET = "cname.vercel-dns.com";

const APP_HOST_EXTRAS = [
  "localhost",
  "127.0.0.1",
  "greenroomfestivals.in",
  "www.greenroomfestivals.in",
];

/**
 * Hostnames that serve the Greenroom app itself (not institution custom domains).
 */
export function getAppHosts(): Set<string> {
  const hosts = new Set<string>(APP_HOST_EXTRAS.map((h) => h.toLowerCase()));

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
  return describeCustomDomainProblem(domain) === null;
}

/**
 * Why an apex domain is unusable, phrased for the person typing it — or null
 * when it is fine. `isValidCustomDomainShape` is the boolean form of exactly
 * these rules, so the Festival Live field can reject bad input before the
 * request and the API still enforces the same thing.
 *
 * Note the input is normalized first: a pasted `https://www.example.com/` is
 * accepted and cleaned up rather than rejected, which is what people actually
 * paste out of a browser bar.
 */
export function describeCustomDomainProblem(domain: string): string | null {
  const raw = domain.trim();
  if (!raw) return "Enter your domain, for example ahlussuffa.in";

  const normalized = normalizeCustomDomain(domain);

  if (!normalized) {
    return "Enter your domain, for example ahlussuffa.in";
  }
  if (normalized.includes(" ")) {
    return "A domain can't contain spaces.";
  }
  if (normalized.includes("..")) {
    return "Remove the double dot — each part must be separated by a single dot.";
  }
  if (normalized.length > 253) {
    return "That domain is too long.";
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) {
    return "Enter a domain name, not an IP address.";
  }

  const labels = normalized.split(".");
  if (labels.length < 2) {
    return `Add the extension too, for example ${normalized}.in`;
  }
  if (labels.some((label) => label.length === 0)) {
    return "A domain can't start or end with a dot.";
  }
  if (labels.some((label) => label.length > 63)) {
    return "Each part of a domain must be 63 characters or fewer.";
  }
  if (labels.some((label) => label.startsWith("-") || label.endsWith("-"))) {
    return "A domain part can't start or end with a hyphen.";
  }
  if (labels.some((label) => !/^[a-z0-9-]+$/.test(label))) {
    return "Use only letters, numbers, and hyphens.";
  }

  return null;
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

/**
 * The branded host for one festival, e.g. `suffamehil.ahlussuffa.in` — or null
 * when either half is unusable.
 *
 * This is the unit Vercel now knows about: each festival host is attached to the
 * project on its own and gets its own HTTP-01 certificate. There is no
 * `*.{apex}` domain on the project anymore (see vercel-domains.service for why),
 * so anything that talks to Vercel or probes TLS builds its host here.
 */
export function buildFestivalHost(
  slug: string,
  customDomain: string,
): string | null {
  const apex = normalizeCustomDomain(customDomain);
  if (!apex || !isValidCustomDomainShape(apex)) return null;

  const label = slug.trim().toLowerCase();
  if (!label || !/^[a-z0-9-]+$/.test(label)) return null;
  if (label.startsWith("-") || label.endsWith("-")) return null;
  if (label.length > 63) return null;

  return `${label}.${apex}`;
}

export type InstitutionDomainFields = {
  customDomain: string | null;
  verifiedAt: string | Date | null;
};

/**
 * Lifecycle of a custom domain, shared by the API and the Festival Live UI.
 *
 * `provisioning` and `manual-attach` are both "DNS verified, HTTPS not proven"
 * — they differ only in who does the attaching, which changes the UI copy.
 */
export type CustomDomainPhase =
  | "no-domain"
  | "awaiting-dns"
  | "provisioning"
  | "manual-attach"
  | "https-ready"
  | "error";

export type CustomDomainStatus = {
  phase: CustomDomainPhase;
  customDomain: string | null;
  verifiedAt: string | null;
  /** TLS readiness of *this festival's* host, not of the institution. */
  httpsReadyAt: string | null;
  /** Human-readable context for the current phase (shown under the badge). */
  detail?: string;
  /**
   * DNS records Vercel requires to complete its own domain challenge.
   * Shown alongside Greenroom's records so the user can finish both in one pass.
   *
   * Should be rare on the HTTP-01 path — it appears when Vercel cannot settle
   * ownership itself, e.g. the apex is claimed by another Vercel team. Carrying
   * the records is what keeps that case actionable instead of a silent spinner.
   */
  vercelVerification?: { type: string; domain: string; value: string }[];
};

/** Phases where polling the status endpoint can still change the outcome. */
export function isCustomDomainPhasePending(phase: CustomDomainPhase): boolean {
  return phase === "provisioning" || phase === "manual-attach";
}

/**
 * Public base URL for a festival: the branded host only once *that host* has
 * served a real certificate. Falls back to the Greenroom path URL otherwise.
 *
 * The gate is `domainHttpsReadyAt` on the festival, not on the institution:
 * certificates are issued per host over HTTP-01, so a verified apex says nothing
 * about whether this particular festival's host is serving yet. Advertising a
 * branded URL before then hands out a link that fails to connect.
 */
export function getPublicFestivalBaseUrl(opts: {
  slug: string;
  institution?: InstitutionDomainFields | null;
  domainHttpsReadyAt?: string | Date | null;
}): string {
  const slug = opts.slug.trim();
  const host = opts.institution?.customDomain
    ? buildFestivalHost(slug, opts.institution.customDomain)
    : null;

  if (host && opts.domainHttpsReadyAt) {
    return `https://${host}`;
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

/**
 * Prefix every festival-scoped link needs on the current host.
 *
 * A branded host already names the festival (`zenoraev.example.in/news`), so
 * repeating the slug there produces `/zenoraev/news` — a path that only exists
 * on the app host. Returns `""` on a branded host and `/{slug}` on the app host,
 * so call sites can keep writing `` `${base}/news` ``.
 */
export function getFestivalLinkBase(
  slug: string | null | undefined,
  isCustomDomain: boolean,
): string {
  if (isCustomDomain) return "";
  const label = (slug ?? "").trim().replace(/^\/+|\/+$/g, "");
  return label ? `/${label}` : "";
}

/** One festival-scoped link: `/news` on a branded host, `/{slug}/news` on the app host. */
export function buildFestivalLinkPath(opts: {
  slug: string | null | undefined;
  path?: string;
  isCustomDomain: boolean;
}): string {
  const base = getFestivalLinkBase(opts.slug, opts.isCustomDomain);
  const path = (opts.path ?? "/").trim();

  if (!path || path === "/") return base || "/";
  // Hash/query-only targets stay on the current page.
  if (path.startsWith("#") || path.startsWith("?")) return `${base}${path}`;

  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * `/{slug}/news` → `/news`, `/{slug}` → `/`. Returns null when the path is not
 * under `/{slug}`, so callers can tell a redundant prefix from a clean path.
 *
 * Matching is per segment: `/zenoraevx` is a different festival, not a prefix.
 */
export function stripFestivalSlugPrefix(
  pathname: string,
  slug: string | null | undefined,
): string | null {
  const label = (slug ?? "").trim().toLowerCase();
  if (!label) return null;

  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const [first, ...rest] = path.split("/").slice(1);
  if ((first ?? "").toLowerCase() !== label) return null;

  const remainder = rest.join("/");
  return remainder ? `/${remainder}` : "/";
}

/**
 * The path as the branded host would show it, whichever host it came from.
 * Lets link comparisons (active nav state) work on either host.
 */
export function toFestivalRelativePath(
  pathname: string,
  slug: string | null | undefined,
): string {
  return stripFestivalSlugPrefix(pathname, slug) ?? (pathname || "/");
}

/**
 * Second segments under a festival slug that must stay on the Greenroom app
 * host. Both run on session cookies set for the app host, so canonicalizing
 * them onto a branded host would sign the organizer or judge straight out.
 */
export const APP_HOST_ONLY_FESTIVAL_SEGMENTS = new Set([
  "editor",
  "stage-portal",
]);

/** Paths under a festival slug that should canonicalize to the branded host. */
export function isPublicFestivalSurfacePath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  if (RESERVED_APP_PATH_SEGMENTS.has(segments[0].toLowerCase())) return false;
  if (
    segments.length > 1 &&
    APP_HOST_ONLY_FESTIVAL_SEGMENTS.has(segments[1].toLowerCase())
  ) {
    return false;
  }
  // /{slug} and any nested public/portal path (not dashboard — already reserved)
  return true;
}
