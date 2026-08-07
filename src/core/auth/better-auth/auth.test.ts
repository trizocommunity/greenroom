import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/database/client", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("@/core/integrations/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: "test-email-id" }),
}));

vi.mock("@/core/database/schema", () => ({
  user: { tableName: "user" },
  session: { tableName: "session" },
  account: { tableName: "account" },
  verification: { tableName: "verification" },
  twoFactor: { tableName: "twoFactor" },
  userLoginEvent: { tableName: "user_login_event" },
}));

describe("better-auth config (ISSUE-41 PR 1 + PR 2 + PR 4)", () => {
  // Better Auth's `betterAuth({...})` constructor introspects adapters
  // and wires plugin state, which takes ~3-4s on a cold import. PR 4
  // adds the `twoFactor` plugin (TOTP, OTP, backup codes, account
  // lockout) which adds another couple of seconds on a cold import.
  // 30s leaves headroom for parallel-runner contention.
  it("instantiates without throwing and exposes the Better Auth API surface", async () => {
    const { auth } = await import("@/core/auth/better-auth/auth");

    expect(auth).toBeDefined();
    expect(typeof auth.api).toBe("object");
    expect(typeof auth.handler).toBe("function");
    expect(typeof auth.options).toBe("object");

    // Better Auth surface we depend on across PRs. Failing this list
    // catches upstream breaking changes during `npm upgrade better-auth`.
    // ISSUE-42 PR C: the magic-link plugin is unmounted. Sign-in goes
    // through the emailOTP plugin only.
    expect(typeof auth.api.signInEmailOTP).toBe("function");
    expect(typeof auth.api.sendVerificationOTP).toBe("function");
    expect(typeof auth.api.createVerificationOTP).toBe("function");
    expect(typeof auth.api.getSession).toBe("function");
    expect(typeof auth.api.signOut).toBe("function");
    expect(typeof auth.api.revokeSession).toBe("function");

    // PR 4 — 2FA plugin surface.
    expect(typeof auth.api.enableTwoFactor).toBe("function");
    expect(typeof auth.api.disableTwoFactor).toBe("function");
    expect(typeof auth.api.verifyTOTP).toBe("function");
    expect(typeof auth.api.verifyTwoFactorOTP).toBe("function");
    expect(typeof auth.api.verifyBackupCode).toBe("function");
    expect(typeof auth.api.sendTwoFactorOTP).toBe("function");
    expect(typeof auth.api.generateBackupCodes).toBe("function");
  }, 30_000);

  // PR 2 (Google OAuth + auto-link). Regression guard: putting `google`
  // in `plugins` is silently ignored by Better Auth, and the request to
  // `/api/auth/sign-in/social` then fails with "Provider not found". The
  // provider must live on the top-level `socialProviders` option.
  it("registers Google as a social provider with auto-link trusted providers", async () => {
    const { auth } = await import("@/core/auth/better-auth/auth");
    const ctx = await auth.$context;
    const list = (ctx as { socialProviders?: { id: string }[] })
      .socialProviders;
    expect(list?.some((p) => p.id === "google")).toBe(true);
    expect(
      (
        auth.options as {
          account?: { accountLinking?: { trustedProviders?: string[] } };
        }
      ).account?.accountLinking?.trustedProviders,
    ).toContain("google");
  }, 15_000);
});
