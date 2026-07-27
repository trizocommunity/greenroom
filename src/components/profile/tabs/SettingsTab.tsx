"use client";

import { useProfile } from "@/api/client/profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UpdateInstitutionDialog } from "../UpdateInstitutionDialog";
import { UpdateProfileDialog } from "../UpdateProfileDialog";

interface SettingsTabProps {
  userId: string;
}

export function SettingsTab({ userId: _userId }: SettingsTabProps) {
  const { data: userData, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Failed to load profile data.</p>
      </div>
    );
  }

  const user = userData;
  const institution = user.institution;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-heading">
          Account settings
        </h2>
        <p className="text-muted-foreground">
          View and manage your account information.
        </p>
      </div>

      {/* Personal Information Card */}
      <Card className="border border-border rounded-2xl bg-card shadow-premium">
        <CardHeader>
          <CardTitle className="font-semibold tracking-tight text-heading">
            Personal information
          </CardTitle>
          <CardDescription>Your personal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Full name</p>
              <p className="text-sm font-medium text-heading">
                {user.fullName || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Display name</p>
              <p className="text-sm font-medium text-heading">
                {user.displayName || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium text-heading">{user.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Account type</p>
              <p className="text-sm font-medium text-heading">
                {user.accountType || "PERSONAL"}
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-border">
            <UpdateProfileDialog user={user} />
          </div>
        </CardContent>
      </Card>

      {/* Institution Information Card - Only for INSTITUTIONAL accounts */}
      {user.accountType === "INSTITUTIONAL" && institution && (
        <Card className="border border-border rounded-2xl bg-card shadow-premium">
          <CardHeader>
            <CardTitle className="font-semibold tracking-tight text-heading">
              Institution information
            </CardTitle>
            <CardDescription>
              Your institutional account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Institution name
                </p>
                <p className="text-sm font-medium text-heading">
                  {institution.name || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Institution type
                </p>
                <p className="text-sm font-medium text-heading">
                  {institution.type || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Affiliation</p>
                <p className="text-sm font-medium text-heading">
                  {institution.affiliation || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">City</p>
                <p className="text-sm font-medium text-heading">
                  {institution.city || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Size range</p>
                <p className="text-sm font-medium text-heading">
                  {institution.sizeRange || "—"}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <UpdateInstitutionDialog institution={institution} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
