import { describe, expect, it } from "vitest";
import { authClient } from "@/core/auth/better-auth/client";

/**
 * Smoke test for the Better Auth client surface used in PR 1 + PR 2 +
 * PR 4. We don't hit the network here — just confirm the methods we
 * depend on exist with the expected shapes. Real auth-flow coverage
 * lives in the integration tests under `src/test/integration`.
 */
describe("better-auth client (ISSUE-41 PR 1 + PR 2 + PR 4 + ISSUE-42 PR B)", () => {
  it("exposes emailOtp.sendVerificationOtp, signIn.social, signOut, and twoFactor client surface", () => {
    expect(authClient).toBeDefined();
    // ISSUE-42 PR B: `emailOTPClient` + the server plugin add the new
    // `emailOtp.sendVerificationOtp` / `emailOtp.verify` methods. The
    // old `signIn.magicLink` (from `magicLinkClient`) is gone — server
    // `magicLink` plugin was unmounted in PR C.
    const emailOtp = (
      authClient as unknown as {
        emailOtp?: {
          sendVerificationOtp?: unknown;
          verify?: unknown;
        };
      }
    ).emailOtp;
    expect(emailOtp).toBeDefined();
    expect(typeof emailOtp?.sendVerificationOtp).toBe("function");
    expect(typeof emailOtp?.verify).toBe("function");

    expect(typeof authClient.signIn.social).toBe("function");
    expect(typeof authClient.signOut).toBe("function");

    // PR 4: 2FA client surface. The twoFactorClient plugin adds
    // enable/disable/verify/send/generate-backup-codes methods.
    expect(authClient.twoFactor).toBeDefined();
    expect(typeof authClient.twoFactor.enable).toBe("function");
    expect(typeof authClient.twoFactor.disable).toBe("function");
    expect(typeof authClient.twoFactor.verifyTotp).toBe("function");
    expect(typeof authClient.twoFactor.verifyOtp).toBe("function");
    expect(typeof authClient.twoFactor.verifyBackupCode).toBe("function");
    expect(typeof authClient.twoFactor.sendOtp).toBe("function");
    expect(typeof authClient.twoFactor.generateBackupCodes).toBe("function");
  });
});
