import type { GlobalRole } from "@/core/auth/session";

export const POST_AUTH_ROUTES = {
  SUPER_ADMIN: "/super-admin",
  ONBOARDING: "/onboarding",
  PROFILE: "/profile",
} as const;

export type PostAuthRoute =
  (typeof POST_AUTH_ROUTES)[keyof typeof POST_AUTH_ROUTES];

export interface PostAuthRouteInput {
  role: GlobalRole;
  requiresOnboarding: boolean;
}

export function getPostAuthRoute(input: PostAuthRouteInput): PostAuthRoute {
  if (input.role === "SUPER_ADMIN") {
    return POST_AUTH_ROUTES.SUPER_ADMIN;
  }
  if (input.requiresOnboarding) {
    return POST_AUTH_ROUTES.ONBOARDING;
  }
  return POST_AUTH_ROUTES.PROFILE;
}
