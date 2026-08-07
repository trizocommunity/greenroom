import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TwoFactorChallengeForm } from "@/components/auth/TwoFactorChallengeForm";
import { auth } from "@/core/auth/better-auth/auth";

export const metadata: Metadata = {
  title: "Verify it's you | Greenroom",
  description: "Enter your two-factor code to finish signing in.",
};

type SearchParams = {
  callbackURL?: string | string[];
  /**
   * When the user has email-OTP enabled, the 2FA flow first redirects
   * here with `?sent=1` to show "we emailed you a code". `sent`
   * survives a refresh — the email-OTP cookie Better Auth writes
   * marks which user we're verifying.
   */
  sent?: string | string[];
};

/**
 * Two-factor challenge page (PR 4 of ISSUE-41).
 *
 * Better Auth's `twoFactor` plugin redirects here when a sign-in
 * succeeds against the first factor (magic link / Google) but the
 * user has 2FA enabled. The plugin sets a short-lived
 * `better-auth.two_factor` cookie containing a verification token;
 * the challenge form reads it and calls one of the
 * `verify-totp` / `verify-otp` / `verify-backup-code` endpoints to
 * complete the sign-in.
 *
 * If the user is not in a 2FA flow (e.g. they navigated here
 * directly), we redirect to `/login` so they don't get stuck on an
 * unverified page.
 */
export default async function TwoFactorChallengePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const hdrs = await headers();
  const sp = await searchParams;

  // Already fully signed in? Skip the challenge.
  const session = await auth.api.getSession({ headers: hdrs });
  if (session?.user?.id && !session.user.twoFactorEnabled) {
    redirect(sp.callbackURL ? String(sp.callbackURL) : "/profile");
  }

  // No session *and* no in-flight 2FA cookie → not a real 2FA
  // challenge. Drop them back to the login screen so they can sign
  // in normally.
  const cookieHeader = hdrs.get("cookie") ?? "";
  const hasTwoFactorCookie = cookieHeader.includes("better-auth.two_factor");

  if (!session?.user?.id && !hasTwoFactorCookie) {
    redirect("/login");
  }

  // Decide which methods to surface. We always allow TOTP and
  // backup codes; email-OTP is offered only when the user actively
  // requests it (Better Auth's `sendOTP` flow).
  const showSentHint = sp.sent === "1";

  return (
    <AuthLayout
      title="Verify it's you"
      description="Enter the code from your authenticator app, or use a backup code."
      variant="centered"
    >
      <TwoFactorChallengeForm
        callbackURL={sp.callbackURL ? String(sp.callbackURL) : "/profile"}
        showSentHint={showSentHint}
      />
    </AuthLayout>
  );
}
