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
        <h2 className="text-3xl font-bold tracking-tight">Account Settings</h2>
        <p className="text-muted-foreground">
          View and manage your account information.
        </p>
      </div>

      {/* Personal Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Your personal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Full Name
              </p>
              <p className="text-sm font-medium">{user.fullName || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Display Name
              </p>
              <p className="text-sm font-medium">{user.displayName || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Account Type
              </p>
              <p className="text-sm font-medium">
                {user.accountType || "PERSONAL"}
              </p>
            </div>
          </div>
          <div className="pt-4 border-t">
            <UpdateProfileDialog user={user} />
          </div>
        </CardContent>
      </Card>

      {/* Institution Information Card - Only for INSTITUTIONAL accounts */}
      {user.accountType === "INSTITUTIONAL" && institution && (
        <Card>
          <CardHeader>
            <CardTitle>Institution Information</CardTitle>
            <CardDescription>
              Your institutional account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Institution Name
                </p>
                <p className="text-sm font-medium">{institution.name || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Institution Type
                </p>
                <p className="text-sm font-medium">{institution.type || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Affiliation
                </p>
                <p className="text-sm font-medium">
                  {institution.affiliation || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  City
                </p>
                <p className="text-sm font-medium">{institution.city || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Size Range
                </p>
                <p className="text-sm font-medium">
                  {institution.sizeRange || "—"}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <UpdateInstitutionDialog institution={institution} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
