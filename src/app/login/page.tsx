import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { MagicLinkRequestForm } from "@/components/auth/MagicLinkRequestForm";
import { getCurrentUser } from "@/core/auth/current-user";
import { getPostAuthRoute } from "@/core/auth/routing";
import { getSession } from "@/core/auth/session";

export const metadata: Metadata = {
  title: "Sign In | Greenroom",
  description: "Sign in to your Greenroom account",
};

export default async function MagicLinkPage() {
  const session = await getSession();

  if (session?.userId) {
    const user = await getCurrentUser();
    if (user) {
      redirect(
        getPostAuthRoute({
          role: user.globalRole as "USER" | "SUPER_ADMIN",
          requiresOnboarding: !user.fullName,
        }),
      );
    }
  }

  return (
    <AuthLayout
      title="Sign in or register"
      description="Enter your email to receive a secure sign-in link."
      variant="centered"
    >
      <MagicLinkRequestForm />
    </AuthLayout>
  );
}
