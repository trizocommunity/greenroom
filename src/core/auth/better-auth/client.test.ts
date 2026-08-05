import { describe, expect, it } from "vitest";
import { authClient } from "@/core/auth/better-auth/client";

/**
 * Smoke test for the Better Auth client surface used in PR 1. We don't
 * hit the network here — just confirm the methods we depend on exist
 * with the expected shapes. Real auth-flow coverage lives in the
 * integration tests under `src/test/integration`.
 */
describe("better-auth client (ISSUE-41 PR 1)", () => {
  it("exposes signIn.magicLink and signIn.social", () => {
    expect(authClient).toBeDefined();
    expect(typeof authClient.signIn.magicLink).toBe("function");
    expect(typeof authClient.signIn.social).toBe("function");
    expect(typeof authClient.signOut).toBe("function");
  });
});
