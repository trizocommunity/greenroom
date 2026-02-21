import { type NextRequest, NextResponse } from "next/server";
import {
  isProtectedRoute,
  isPublicRoute,
  PROTECTED_PATHS,
} from "@/config/routes";
import { decrypt } from "@/lib/auth/session";

/**
 * 3. Auth, RBAC & Security Logic
 * Handles authentication checks and role-based redirects
 */
async function handleSecurityAndRBAC(
  req: NextRequest,
  path: string,
): Promise<NextResponse | null> {
  const cookie = req.cookies.get("session")?.value;
  const session = cookie ? await decrypt(cookie).catch(() => null) : null;
  const isAuthenticated = !!session?.userId;

  // Protected Route Guard
  if (isProtectedRoute(path) && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Public Route Guard (Redirect logged-in users)
  if (
    isAuthenticated &&
    isPublicRoute(path) &&
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
  const path = req.nextUrl.pathname;

  // 1. Security & RBAC
  const securityResponse = await handleSecurityAndRBAC(req, path);
  if (securityResponse) return securityResponse;

  return NextResponse.next();
}

// Routes Matcher
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.png$|.*\\.ico$|.*\\.svg$).*)",
  ],
};
