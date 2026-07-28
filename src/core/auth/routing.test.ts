import { describe, expect, it } from "vitest";
import { getPostAuthRoute, POST_AUTH_ROUTES } from "./routing";

describe("getPostAuthRoute", () => {
  it("routes SUPER_ADMIN to /super-admin", () => {
    expect(
      getPostAuthRoute({ role: "SUPER_ADMIN", requiresOnboarding: false }),
    ).toBe(POST_AUTH_ROUTES.SUPER_ADMIN);
  });

  it("routes SUPER_ADMIN to /super-admin even when onboarding is required", () => {
    expect(
      getPostAuthRoute({ role: "SUPER_ADMIN", requiresOnboarding: true }),
    ).toBe(POST_AUTH_ROUTES.SUPER_ADMIN);
  });

  it("routes USER without onboarding to /profile", () => {
    expect(
      getPostAuthRoute({ role: "USER", requiresOnboarding: false }),
    ).toBe(POST_AUTH_ROUTES.PROFILE);
  });

  it("routes USER with onboarding pending to /onboarding", () => {
    expect(
      getPostAuthRoute({ role: "USER", requiresOnboarding: true }),
    ).toBe(POST_AUTH_ROUTES.ONBOARDING);
  });
});
