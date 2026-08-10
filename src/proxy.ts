import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/config/routes";
import {
  extractFestivalSlugFromPath,
  getAppHosts,
  isPublicFestivalSurfacePath,
  parseCustomFestivalHost,
} from "@/features/institutions/lib/custom-domain";
import { findVerifiedInstitutionByCustomDomain } from "@/features/institutions/repositories/institution.repository";
import { findBrandedRedirectTarget } from "@/features/festivals/repositories/festival.repository";

const CSRF_SECRET =
  process.env.CSRF_SECRET || "default-csrf-secret-change-in-production";
const NONCE_LENGTH = 16;

function generateNonce(): string {
  const bytes = new Uint8Array(NONCE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signNonce(nonce: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(nonce),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function applySecurityHeaders(
  response: NextResponse,
  nonce: string,
  signature: string,
): NextResponse {
  response.cookies.set("_csrf_nonce", nonce, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });

  response.cookies.set("_csrf_sig", signature, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });

  response.headers.set("x-csrf-nonce", nonce);
  response.headers.set("x-csrf-signature", signature);

  const cspNonce = `'nonce-${nonce}'`;

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  );
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' ${cspNonce} https://checkout.razorpay.com https://cdn.razorpay.com`,
      `style-src 'self' ${cspNonce}`,
      "img-src 'self' https://res.cloudinary.com data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://api.cloudinary.com https://api.razorpay.com https://lumberjack.razorpay.com wss://*.socket.io",
      "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

async function withCsrf(response: NextResponse): Promise<NextResponse> {
  const nonce = generateNonce();
  const signature = await signNonce(nonce, CSRF_SECRET);
  return applySecurityHeaders(response, nonce, signature);
}

/**
 * CSRF/CSP cookies+headers historically only ran on `/api/*`.
 * Applying that strict CSP to HTML documents blanked the app (inline styles
 * blocked; interactive UI dead) while still returning 200.
 */
function shouldApplySecurityHeaders(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

async function finalize(
  pathname: string,
  response: NextResponse,
): Promise<NextResponse> {
  if (shouldApplySecurityHeaders(pathname)) {
    return withCsrf(response);
  }
  return response;
}

function isPassthroughPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

/**
 * Path→branded redirect is unsafe in Phase 1 until TLS is attached on Vercel.
 * Opt in with ENABLE_CUSTOM_DOMAIN_CANONICAL_REDIRECT=true after wildcard HTTPS works.
 * Always off on local app hosts so path URLs keep working in dev.
 */
function shouldCanonicalRedirectToBrandedHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1") return false;
  if (process.env.NODE_ENV !== "production") return false;
  return process.env.ENABLE_CUSTOM_DOMAIN_CANONICAL_REDIRECT === "true";
}

export async function proxy(request: NextRequest) {
  const hostHeader = request.headers.get("host") || "";
  const appHosts = getAppHosts();
  const hostname = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  const { pathname, search } = request.nextUrl;
  const isAppHost = appHosts.has(hostname);

  // ── Custom festival host ──────────────────────────────────────────────
  if (!isAppHost) {
    const parsed = parseCustomFestivalHost(hostHeader, appHosts);

    // Apex / www / malformed → no festival here
    if (!parsed) {
      return finalize(pathname, new NextResponse("Not Found", { status: 404 }));
    }

    // Leave API/static on same origin (cookies); no rewrite
    if (isPassthroughPath(pathname)) {
      return finalize(pathname, NextResponse.next());
    }

    // Organizer dashboard always lives on Greenroom app host
    if (pathname.startsWith("/dashboard")) {
      const redirectUrl = `${getAppBaseUrl()}${pathname}${search}`;
      return finalize(pathname, NextResponse.redirect(redirectUrl));
    }

    const verified = await findVerifiedInstitutionByCustomDomain(
      parsed.customDomain,
    );
    if (!verified) {
      return finalize(pathname, new NextResponse("Not Found", { status: 404 }));
    }

    const rewritePath =
      pathname === "/"
        ? `/${parsed.festivalSlug}`
        : `/${parsed.festivalSlug}${pathname}`;

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = rewritePath;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-institution-id", verified.institutionId);
    requestHeaders.set("x-festival-slug", parsed.festivalSlug);
    requestHeaders.set("x-custom-domain", parsed.customDomain);

    return finalize(
      pathname,
      NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      }),
    );
  }

  // ── App host: optional path → branded subdomain (canonical) ───────────
  if (
    shouldCanonicalRedirectToBrandedHost(hostname) &&
    !isPassthroughPath(pathname) &&
    isPublicFestivalSurfacePath(pathname) &&
    !pathname.startsWith("/dashboard")
  ) {
    const slug = extractFestivalSlugFromPath(pathname);
    if (slug) {
      try {
        const branded = await findBrandedRedirectTarget(slug);
        if (branded) {
          const rest =
            pathname === `/${slug}` || pathname === `/${slug}/`
              ? "/"
              : pathname.slice(slug.length + 1) || "/";
          const dest = new URL(
            rest === "/" ? "/" : rest,
            `https://${branded.festivalSlug}.${branded.customDomain}`,
          );
          dest.search = search;
          return finalize(pathname, NextResponse.redirect(dest, 302));
        }
      } catch {
        // DB unavailable — fall through to normal handling
      }
    }
  }

  return finalize(pathname, NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Host routing must see page navigations; CSRF/CSP still applied only to /api/*
     * inside the handler (see shouldApplySecurityHeaders).
     */
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
