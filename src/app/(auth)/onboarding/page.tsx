import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { getCurrentUser } from "@/core/auth/current-user";

export const metadata: Metadata = {
  title: "Setup Your Account | Greenroom",
  description: "Choose your account type and complete your profile",
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.fullName) {
    redirect("/profile");
  }

  return (
    <AuthLayout
      title="Choose Your Account Type"
      description="Select how you'll use Greenroom"
    >
      <div className="space-y-4">
        <div className="rounded-lg border p-6 hover:border-primary transition-colors">
          <a href="/onboarding/personal" className="block">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Personal Account
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              For individuals, independent organizers, or personal festival
              management.
            </p>
            <div className="text-xs text-muted-foreground">
              Perfect for solo judges, independent event coordinators, or small
              personal events.
            </div>
          </a>
        </div>
        <div className="rounded-lg border p-6 hover:border-primary transition-colors">
          <a href="/onboarding/institutional" className="block">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Institutional Account
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              For colleges, madrasas, schools, universities, and other
              educational institutions.
            </p>
            <div className="text-xs text-muted-foreground">
              Ideal for campus festivals, inter-college competitions, and
              madrasa events.
            </div>
          </a>
        </div>
      </div>
    </AuthLayout>
  );
}
