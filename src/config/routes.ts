export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://trizo-greenroom.vercel.app"
    : "http://localhost:3000");

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
