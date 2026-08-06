import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { EmailOtpSignInForm } from "@/components/auth/EmailOtpSignInForm";
import { auth } from "@/core/auth/better-auth/auth";
import { getPostAuthRoute } from "@/core/auth/routing";

export const metadata: Metadata = {
  title: "Sign In | Greenroom",
  description: "Sign in to your Greenroom account with a 4-digit code",
};

export default async function MagicLinkPage() {
  // Better Auth owns the sign-in flow. Read the session server-side so a
  // logged-in user gets redirected to the right landing page before the
  // client renders the form.
  const headerList = await headers();
  const betterSession = await auth.api.getSession({
    headers: headerList,
  });

  if (betterSession?.user?.id) {
    const role =
      (betterSession.user as { globalRole?: "USER" | "SUPER_ADMIN" })
        .globalRole ?? "USER";
    const requiresOnboarding = !(
      betterSession.user as { fullName?: string | null }
    ).fullName;
    redirect(
      getPostAuthRoute({
        role,
        requiresOnboarding,
      }),
    );
  }

  return (
    <AuthLayout
      title="Sign in or register"
      description="Enter your email — we'll send you a 4-digit code."
      variant="centered"
    >
      <EmailOtpSignInForm />
    </AuthLayout>
  );
}
