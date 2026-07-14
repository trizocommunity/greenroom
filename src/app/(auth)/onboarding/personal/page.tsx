import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PersonalOnboardingForm } from "@/components/onboarding/PersonalOnboardingForm";
import { getCurrentUser } from "@/core/auth/current-user";

export const metadata: Metadata = {
  title: "Personal Account Setup | Greenroom",
  description: "Set up your personal Greenroom account",
};

export default async function PersonalOnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.fullName) {
    redirect("/profile");
  }

  return (
    <AuthLayout title="Personal Account" description="Tell us about yourself">
      <PersonalOnboardingForm />
      <div className="mt-4 text-center text-sm text-muted-foreground">
        <Link
          href="/onboarding"
          className="underline underline-offset-4 hover:text-primary"
        >
          Back to account type selection
        </Link>
      </div>
    </AuthLayout>
  );
}
