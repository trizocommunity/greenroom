"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useProfile } from "@/api/client/profile";
import {
  AppPageHeader,
  AppSectionHeading,
  DataRow,
} from "@/components/app/AppSection";
import { TwoFactorSetup } from "@/components/auth/TwoFactorSetup";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UpdateInstitutionDialog } from "../UpdateInstitutionDialog";
import { UpdateProfileDialog } from "../UpdateProfileDialog";
import { UpgradeToInstitutionalDialog } from "../UpgradeToInstitutionalDialog";

interface SettingsTabProps {
  userId: string;
}

type ThemeMode = "light" | "dark" | "system";

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

export function SettingsTab({ userId: _userId }: SettingsTabProps) {
  const { data: userData, isLoading } = useProfile();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme: ThemeMode | undefined = THEME_OPTIONS.find(
    (o) => o.value === theme,
  )?.value;

  if (isLoading) {
    return (
      <div className="animate-in fade-in space-y-8 duration-500">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!userData) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Failed to load profile data.
      </p>
    );
  }

  const user = userData;
  const institution = user.institution;
  const isInstitutional =
    user.accountType === "INSTITUTIONAL" && Boolean(institution);

  return (
    <div className="animate-in fade-in space-y-10 duration-500">
      <AppPageHeader
        eyebrow="Settings"
        title="Account"
        description="Your details and how Greenroom looks for you."
      />

      <section>
        <AppSectionHeading title="Personal information" />
        <dl className="border-t border-border">
          <DataRow label="Full name" value={user.fullName} />
          <DataRow label="Display name" value={user.displayName} />
          <DataRow label="Email" value={user.email} />
          <DataRow
            label="Account type"
            value={user.accountType || "PERSONAL"}
          />
        </dl>
        <div className="mt-5">
          <UpdateProfileDialog user={user} />
        </div>
      </section>

      {!isInstitutional && (
        <section className="border-t border-border pt-8">
          <AppSectionHeading title="Institution" />
          <div className="rounded-2xl border border-border bg-muted/40 p-5">
            <p className="text-sm font-medium text-heading">
              You&apos;re on a personal account
            </p>
            <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
              Custom domains belong to an institution, so a personal account
              can&apos;t set one up. Add your institution to serve festivals on
              your own domain — festivals you already own move under it
              automatically.
            </p>
            <div className="mt-5">
              <UpgradeToInstitutionalDialog />
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-border pt-8">
        <AppSectionHeading
          title="Preferences"
          description="Choose how Greenroom looks for you."
        />

        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="theme-select">Appearance</Label>
            <Select
              value={mounted ? (currentTheme ?? "system") : undefined}
              onValueChange={(value) => setTheme(value as ThemeMode)}
              disabled={!mounted}
            >
              <SelectTrigger
                id="theme-select"
                className="w-full sm:w-72"
                aria-label="Appearance"
              >
                <SelectValue placeholder="Loading…" />
              </SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              System follows your device&apos;s appearance.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border pt-8">
        <AppSectionHeading
          title="Security"
          description="Protect your account with a second factor."
        />
        <TwoFactorSetup />
      </section>

      {isInstitutional && institution && (
        <section className="border-t border-border pt-8">
          <AppSectionHeading title="Institution" />
          <dl className="border-t border-border">
            <DataRow label="Name" value={institution.name} />
            <DataRow label="Type" value={institution.type} />
            <DataRow label="Affiliation" value={institution.affiliation} />
            <DataRow label="City" value={institution.city} />
            <DataRow label="Size range" value={institution.sizeRange} />
          </dl>
          <div className="mt-5">
            <UpdateInstitutionDialog institution={institution} />
          </div>
        </section>
      )}
    </div>
  );
}
