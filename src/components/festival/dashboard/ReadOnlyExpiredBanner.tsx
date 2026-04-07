"use client";

import { AlertTriangle } from "lucide-react";
import { useFestival } from "@/components/festival/FestivalContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ReadOnlyExpiredBanner() {
  const festival = useFestival();
  if (!festival?.readOnlyExpired) return null;

  return (
    <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle>Festival expired — read-only access</AlertTitle>
      <AlertDescription>
        This festival has passed its end date. You can still view data during
        the retention period, but create, edit, and delete actions are disabled.
        Renew or upgrade to restore full access.
      </AlertDescription>
    </Alert>
  );
}
