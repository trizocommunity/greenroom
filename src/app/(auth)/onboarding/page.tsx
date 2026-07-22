import { ArrowRight, Building2, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
      title="Choose Account Type"
      description="Select how you will use Greenroom"
      variant="centered"
    >
      <div className="space-y-3">
        <Link
          href="/onboarding/personal"
          className="group flex items-center justify-between p-4 sm:p-4.5 rounded-xl border border-border/60 bg-secondary/15 hover:bg-secondary/30 hover:border-primary transition-all text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-medium text-foreground tracking-tight">
                Personal Account
              </h2>
              <p className="text-xs text-muted-foreground leading-normal mt-0.5">
                For individuals, organizers, or judges.
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1 shrink-0 ml-2" />
        </Link>

        <Link
          href="/onboarding/institutional"
          className="group flex items-center justify-between p-4 sm:p-4.5 rounded-xl border border-border/60 bg-secondary/15 hover:bg-secondary/30 hover:border-primary transition-all text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-medium text-foreground tracking-tight">
                Institutional Account
              </h2>
              <p className="text-xs text-muted-foreground leading-normal mt-0.5">
                For colleges, schools, universities & campus events.
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1 shrink-0 ml-2" />
        </Link>
      </div>
    </AuthLayout>
  );
}
