import { emailOTPClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Better Auth browser client.
 *
 * Used by client components for sign-in / sign-out / session reads.
 * The actual cookie is set by the catch-all server route at
 * `/api/auth/[...all]`; this client just drives the fetch.
 *
 * `baseURL` defaults to the current origin in the browser. We pass
 * `NEXT_PUBLIC_APP_URL` for SSR-time callers so the relative fetch
 * resolves correctly.
 *
 * `emailOTPClient` (ISSUE-42 PR B): registers the new
 * `/sign-in/email-otp` + `/email-otp/send-verification-otp` endpoints
 * on the client surface. Replaces `magicLinkClient` — the magic-link
 * plugin was unmounted from the server in PR C.
 *
 * The `twoFactorClient` plugin (PR 4 of ISSUE-41) registers the
 * `/two-factor/*` endpoints on the client surface — enable, disable,
 * verify-totp, verify-otp, verify-backup-code, send-otp,
 * generate-backup-codes. It also wires the `onTwoFactorRedirect`
 * hook so a 2FA challenge interrupts the sign-in flow as soon as
 * the server returns the `twoFactorRedirect` flag. We point it at
 * `/auth/2fa` (the challenge page).
 */
export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? `${window.location.origin}/api/v1/auth`
      : process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/auth`
        : undefined,
  plugins: [
    emailOTPClient(),
    twoFactorClient({
      twoFactorPage: "/auth/2fa",
    }),
  ],
});

export const { signIn, signOut, signUp, useSession, twoFactor } = authClient;
