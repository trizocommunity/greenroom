export const MAIN_DOMAIN =
  process.env.NEXT_PUBLIC_MAIN_DOMAIN || "greenroom.com";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const PROTECTED_PATHS = {
  USER: "/profile",
  ADMIN: "/super-admin",
} as const;

export const protectedRoutes = ["/profile", "/super-admin"];

export const publicRoutes = [
  "/login",
  "/register",
  "/forget-password",
  "/reset-password",
  "/",
  "/about",
  "/features",
  "/services",
  "/contact",
  "/pricing",
];

export const authRoutes = [
  "/login",
  "/register",
  "/forget-password",
  "/reset-password",
];

export const festivalRoutes = [
  "/about",
  "/news",
  "/gallery",
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
