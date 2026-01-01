import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { decrypt } from "@/lib/auth/session";

// 1. Specify protected and public routes
const protectedRoutes = ["/profile", "/super-admin"];
const publicRoutes = [
  "/login",
  "/register",
  "/forget-password",
  "/reset-password",
  "/",
  "/about",
  "/features",
  "/services",
  "/contact",
];
const festivalRoutes = ["/about", "/news", "/gallery", "/sessions", "/results"];

const authRoutes = [
  "/login",
  "/register",
  "/forget-password",
  "/reset-password",
];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const host = req.headers.get("host") || "";

  // Extract subdomain for multi-tenant routing
  // In production: mambamehfil.greenrooom.com -> subdomain = "mambamehfil"
  // In local dev: use ?festival=slug query param as fallback
  const hostParts = host.split(".");
  const isSubdomain =
    hostParts.length > 2 ||
    (hostParts.length === 2 && !hostParts[0].includes("localhost"));
  const subdomain = isSubdomain ? hostParts[0] : null;

  // Local dev fallback: ?festival=slug
  const festivalSlug = subdomain || req.nextUrl.searchParams.get("festival");

  // Check if this is a festival subdomain/request
  const isFestivalRequest =
    festivalSlug &&
    festivalSlug !== "www" &&
    festivalSlug !== "greenrooom" &&
    festivalSlug !== "localhost" &&
    festivalSlug !== "api";

  // Handle festival subdomain routing
  if (
    isFestivalRequest &&
    !path.startsWith("/api") &&
    !path.startsWith("/_next") &&
    !path.startsWith("/festival") &&
    !authRoutes.includes(path)
  ) {
    // Prevent access to /dashboard on subdomain
    if (path.includes("/dashboard")) {
      // Redirect to main app dashboard: app.greenroom.com/dashboard/{slug}
      // For local dev, we assume main app is on localhost:3000
      const mainAppHost = process.env.NEXT_PUBLIC_APP_URL
        ? new URL(process.env.NEXT_PUBLIC_APP_URL).host
        : "localhost:3000";

      // Remove /dashboard from the path to avoid /dashboard/[slug]/dashboard
      // If path is exactly "/dashboard", newPath becomes ""
      // If path is "/dashboard/settings", newPath becomes "/settings"
      const newPath = path.replace(/^\/dashboard/, "");

      const url = new URL(
        `/dashboard/${festivalSlug}${newPath}`,
        `http://${mainAppHost}`,
      );
      return NextResponse.redirect(url);
    }

    // Rewrite to internal festival route (using (festivalPublic) group implicitly)
    const url = req.nextUrl.clone();
    url.pathname = `/${festivalSlug}${path === "/" ? "" : path}`;
    // Remove festival query param after rewrite (for local dev)
    url.searchParams.delete("festival");
    return NextResponse.rewrite(url);
  }

  // 2. Check if the current route is protected or public
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route),
  );
  const isPublicRoute =
    publicRoutes.includes(path) ||
    publicRoutes.some((route) => path.startsWith(route) && route !== "/");

  // 3. Decrypt the session from the cookie
  const cookie = req.cookies.get("session")?.value;
  const session = cookie ? await decrypt(cookie).catch(() => null) : null;

  // 4. Redirect to /login if the user is not authenticated
  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // 6. Strict Access: Redirect to dashboard if authenticated and tries to access ANY public route
  // EXCEPTION: Allow access to festival subdomains so admins can view the public site
  if (
    session?.userId &&
    isPublicRoute &&
    path !== "/profile" &&
    path !== "/super-admin" &&
    !isFestivalRequest
  ) {
    const target = session.role === "SUPER_ADMIN" ? "/super-admin" : "/profile";
    return NextResponse.redirect(new URL(target, req.nextUrl));
  }

  // 7. Role-Based Access Control
  const role = session?.role;

  // STRICT RULE: Super Admins cannot access User routes (Profile)
  if (role === "SUPER_ADMIN") {
    if (path.startsWith("/profile")) {
      return NextResponse.redirect(new URL("/super-admin", req.nextUrl));
    }
    // Redirect root to super-admin dashboard for logged-in super admins
    if (path === "/") {
      return NextResponse.redirect(new URL("/super-admin", req.nextUrl));
    }
  }

  // STRICT RULE: Users cannot access Super Admin routes
  if (role === "USER") {
    if (path.startsWith("/super-admin")) {
      return NextResponse.redirect(new URL("/profile", req.nextUrl));
    }
    // Redirect root to profile for logged-in users
    if (path === "/") {
      return NextResponse.redirect(new URL("/profile", req.nextUrl));
    }
  }

  return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.png$|.*\\.ico$|.*\\.svg$).*)",
  ],
};
