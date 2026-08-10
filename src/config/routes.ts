/**
 * Public origin for absolute links (emails, QR, redirects).
 * Resolved at call time so server runtimes always see the current env.
 */
export function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${host}`;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://greenroomm.vercel.app";
  }
  return "http://localhost:3000";
}

/** @deprecated Prefer {@link getAppBaseUrl} so the value is not frozen at import time. */
export const APP_URL = getAppBaseUrl();

/**
 * Absolute invitation accept URL: `{origin}/invite/{token}`.
 * Never includes a festival slug — the invite page loads festival from the token.
 */
export function buildInviteUrl(token: string): string {
  const clean = String(token ?? "").trim();
  if (!clean) {
    throw new Error("buildInviteUrl: token is required");
  }
  // Path-safe: UUIDs pass through unchanged; blocks accidental `/` or `?` in token.
  return `${getAppBaseUrl()}/invite/${encodeURIComponent(clean)}`;
}

export const PROTECTED_PATHS = {
  USER: "/profile",
  ADMIN: "/super-admin",
} as const;

export const protectedRoutes = ["/profile", "/super-admin"];

export const publicRoutes = [
  "/login",
  "/invite",
  "/",
  "/about",
  "/features",
  "/services",
  "/contact",
  "/pricing",
];

export const authRoutes = ["/login"];

export const festivalRoutes = [
  "/about",
  "/news",
  "/media",
  "/sessions",
  "/results",
];

export function isProtectedRoute(path: string): boolean {
  return protectedRoutes.some((route) => path.startsWith(route));
}

export function isPublicRoute(path: string): boolean {
  return (
    publicRoutes.includes(path) ||
    publicRoutes.some((route) => path.startsWith(route) && route !== "/")
  );
}

export function isAuthRoute(path: string): boolean {
  return authRoutes.includes(path);
}
