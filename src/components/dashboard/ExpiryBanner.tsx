"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Clock } from "lucide-react";
import type { EditionStatus } from "@prisma/client";

interface ExpiryBannerProps {
  status: EditionStatus;
  daysRemaining: number;
}

export function ExpiryBanner({ status, daysRemaining }: ExpiryBannerProps) {
  if (status !== "ACTIVE") return null;

  // Final 48 hours (approx 2 days)
  if (daysRemaining <= 2) {
    return (
      <Alert
        variant="destructive"
        className="mb-6 border-red-200 bg-red-50 text-red-900"
      >
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Final Access Phase</AlertTitle>
        <AlertDescription>
          This edition will freeze in {daysRemaining} days. All data will become
          read-only.
        </AlertDescription>
      </Alert>
    );
  }

  // Warning Phase (3-14 days)
  if (daysRemaining <= 14) {
    return (
      <Alert className="mb-6 border-yellow-200 bg-yellow-50 text-yellow-900">
        <Clock className="h-4 w-4 text-yellow-700" />
        <AlertTitle className="text-yellow-800">Edition Ending Soon</AlertTitle>
        <AlertDescription className="text-yellow-700">
          This edition enters read-only mode in {daysRemaining} days.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
