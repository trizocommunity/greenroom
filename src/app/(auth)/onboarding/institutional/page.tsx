import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { InstitutionalOnboardingForm } from "@/components/onboarding/InstitutionalOnboardingForm";
import { getCurrentUser } from "@/core/auth/current-user";

export const metadata: Metadata = {
  title: "Institutional Account Setup | Greenroom",
  description: "Set up your institutional Greenroom account",
};

export default async function InstitutionalOnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.fullName) {
    redirect("/profile");
  }

  return (
    <AuthLayout
      title="Institutional Account"
      description="Enter institution & profile details"
      variant="centered"
    >
      <InstitutionalOnboardingForm />
      <div className="mt-3 text-center text-xs text-muted-foreground">
        <Link
          href="/onboarding"
          className="underline underline-offset-4 hover:text-primary"
        >
          Back to account selection
        </Link>
      </div>
    </AuthLayout>
  );
}
