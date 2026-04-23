import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "Setup Your Profile | Greenroom",
  description: "Complete your profile to get started with Greenroom",
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  // Not authenticated → go to login
  if (!user) {
    redirect("/login");
  }

  // Already completed onboarding → skip to profile
  if (user.fullName) {
    redirect("/profile");
  }

  return <OnboardingForm email={user.email} />;
}
