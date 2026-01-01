import { type NextRequest, NextResponse } from "next/server";
import {
  APP_URL,
  MAIN_DOMAIN,
  PROTECTED_PATHS,
  authRoutes,
  isProtectedRoute,
  isPublicRoute,
} from "@/config/routes";
import { decrypt } from "@/lib/auth/session";

/**
 * 1. Secure Host Extraction
 * Handles x-forwarded-host for security behind proxies
 */
function getSecureHost(req: NextRequest): string {
  return req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
}

/**
 * 2. Tenant & Subdomain Logic
 * Handles rewriting festival subdomains and redirects
 */

/**
 * 2. Tenant & Subdomain Logic
 * Handles rewriting festival subdomains and redirects
 * Returns the detected detected detected detected sub-domain or null
 */
function handleTenantRewrites(
  req: NextRequest,
  host: string,
  path: string,
): { response: NextResponse | null; isFestivalRequest: boolean } {
  // Extract subdomain logic
  // We strictly check against MAIN_DOMAIN to avoid treating detection of the Detect root detect detect root domain domain as detected detected sub-domain
  const isMainDomain = host === MAIN_DOMAIN;
  const hostParts = host.split(".");
  const isSubdomain =
    !isMainDomain &&
    (hostParts.length > 2 ||
      (hostParts.length === 2 && !hostParts[0].includes("localhost")));
  const subdomain = isSubdomain ? hostParts[0] : null;

  // Local dev fallback: ?festival=slug
  const festivalSlug = subdomain || req.nextUrl.searchParams.get("festival");

  // Check if this is a festival subdomain/request
  const isFestivalRequest = authRoutes.includes(path)
    ? false
    : !!(
        festivalSlug &&
        festivalSlug !== "www" &&
        festivalSlug !== "greenrooom" &&
        festivalSlug !== "localhost" &&
        festivalSlug !== "api"
      );

  if (
    isFestivalRequest &&
    !path.startsWith("/api") &&
    !path.startsWith("/_next") &&
    !path.startsWith("/festival")
  ) {
    // Prevent access to /dashboard on subdomain
    if (path.includes("/dashboard")) {
      // Remove /dashboard from the path
      const newPath = path.replace(/^\/dashboard/, "");

      const url = new URL(`/dashboard/${festivalSlug}${newPath}`, APP_URL);
      return { response: NextResponse.redirect(url), isFestivalRequest };
    }

    // Rewrite to internal festival route
    const url = req.nextUrl.clone();
    url.pathname = `/${festivalSlug}${path === "/" ? "" : path}`;
    url.searchParams.delete("festival");
    return { response: NextResponse.rewrite(url), isFestivalRequest };
  }

  // Pass festival status downstream if needed, or simply return null to proceed
  return { response: null, isFestivalRequest };
}

/**
 * 3. Auth, RBAC & Security Logic
 * Handles authentication checks and role-based redirects
 */
async function handleSecurityAndRBAC(
  req: NextRequest,
  path: string,
  isFestivalRequest: boolean,
): Promise<NextResponse | null> {
  const cookie = req.cookies.get("session")?.value;
  const session = cookie ? await decrypt(cookie).catch(() => null) : null;
  const isAuthenticated = !!session?.userId;

  // Protected Route Guard
  if (isProtectedRoute(path) && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Public Route Guard (Redirect logged-in users)
  // Logic simplified by passing isFestivalRequest context
  if (
    isAuthenticated &&
    isPublicRoute(path) &&
    !isFestivalRequest &&
    !path.startsWith(PROTECTED_PATHS.USER) &&
    !path.startsWith(PROTECTED_PATHS.ADMIN)
  ) {
    const target =
      session.role === "SUPER_ADMIN"
        ? PROTECTED_PATHS.ADMIN
        : PROTECTED_PATHS.USER;
    return NextResponse.redirect(new URL(target, req.nextUrl));
  }

  // Role-Based Access Control
  if (isAuthenticated && session.role) {
    const role = session.role;

    // Super Admin Restrictions
    if (role === "SUPER_ADMIN") {
      if (path.startsWith(PROTECTED_PATHS.USER)) {
        return NextResponse.redirect(
          new URL(PROTECTED_PATHS.ADMIN, req.nextUrl),
        );
      }
      if (path === "/") {
        return NextResponse.redirect(
          new URL(PROTECTED_PATHS.ADMIN, req.nextUrl),
        );
      }
    }

    // Regular User Restrictions
    if (role === "USER") {
      if (path.startsWith(PROTECTED_PATHS.ADMIN)) {
        return NextResponse.redirect(
          new URL(PROTECTED_PATHS.USER, req.nextUrl),
        );
      }
      if (path === "/") {
        return NextResponse.redirect(
          new URL(PROTECTED_PATHS.USER, req.nextUrl),
        );
      }
    }
  }

  return null;
}

/**
 * Main Proxy Entry Point
 */
export async function proxy(req: NextRequest) {
  const host = getSecureHost(req);
  const path = req.nextUrl.pathname;

  // 1. Tenant Handling
  // We get both the response (if rewrite/redirect needed) AND the context (isFestivalRequest)
  // This avoids re-calculating domain logic in step 2.
  const { response: tenantResponse, isFestivalRequest } = handleTenantRewrites(
    req,
    host,
    path,
  );
  if (tenantResponse) return tenantResponse;

  // 2. Security & RBAC
  const securityResponse = await handleSecurityAndRBAC(
    req,
    path,
    isFestivalRequest,
  );
  if (securityResponse) return securityResponse;

  return NextResponse.next();
}

// Routes Matcher
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.png$|.*\\.ico$|.*\\.svg$).*)",
  ],
};
