"use client";

import { useFestival } from "@/components/festival/FestivalContext";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ReactNode } from "react";

/**
 * PermissionGate
 *
 * Wraps content that requires a specific Edition Status to be editable/interactive.
 * If the condition is not met, it can:
 * 1. Hide the content (type="hidden")
 * 2. Show a banner/alert and disable content (type="disable") - *Complex to disable generic children*
 * 3. Show a banner/alert and hide content (type="block")
 *
 * Current Phase 5 requirement:
 * - FREEZE: Read-only (disable writes) -> effectively "block" for write actions or "disable" inputs.
 * - ARCHIVED: Read-only.
 *
 * For simplicity in Phase 5, we will use this primarily to Guard entire pages or sections.
 */

interface PermissionGateProps {
  children: ReactNode;
  /**
   * The status required to access the children fully.
   * Default: "ACTIVE"
   */
  requiredStatus?: "ACTIVE" | "FREEZE" | "ARCHIVED";
  /**
   * How to handle permission failure.
   * - block: Show an alert instead of children.
   * - hidden: Render nothing.
   * - banner: Render children but prepend a banner (useful for read-only views).
   */
  fallbackType?: "block" | "hidden" | "banner";
}

export function PermissionGate({
  children,
  requiredStatus = "ACTIVE",
  fallbackType = "block",
}: PermissionGateProps) {
  const { activeEdition } = useFestival();
  const currentStatus = activeEdition?.status || "ARCHIVED"; // Default to ARCHIVED if no edition (safest)

  const isAllowed = currentStatus === requiredStatus;

  // Logic for subsets:
  // If required is ACTIVE, only ACTIVE allowed.
  // If required is FREEZE, ACTIVE and FREEZE allowed? Usually "Read Only" means "Not Active".
  // Let's stick to strict equality for now or specific logic.

  // Requirement:
  // ACTIVE: Enabled.
  // FREEZE: Read-only.
  // ARCHIVED: Read-only.

  // If we want to guard a "Create" button, we require "ACTIVE".
  // If current is FREEZE, isAllowed = false.

  if (isAllowed) {
    return <>{children}</>;
  }

  // Handle Failure
  if (fallbackType === "hidden") {
    return null;
  }

  if (fallbackType === "banner") {
    return (
      <div className="space-y-4">
        <StatusAlert status={currentStatus} />
        <div className="opacity-75 pointer-events-none grayscale">
          {children}
        </div>
      </div>
    );
  }

  // Block
  return (
    <div className="py-8">
      <StatusAlert status={currentStatus} />
    </div>
  );
}

function StatusAlert({ status }: { status: string }) {
  if (status === "FREEZE") {
    return (
      <Alert
        variant="destructive"
        className="bg-yellow-50 border-yellow-200 text-yellow-900"
      >
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertTitle>Edition Frozen</AlertTitle>
        <AlertDescription>
          This edition is currently frozen. Changes cannot be made at this time.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "ARCHIVED") {
    return (
      <Alert
        variant="default"
        className="bg-gray-50 border-gray-200 text-gray-900"
      >
        <AlertCircle className="h-4 w-4 text-gray-600" />
        <AlertTitle>Archived Edition</AlertTitle>
        <AlertDescription>
          This edition is archived and is read-only.
        </AlertDescription>
      </Alert>
    );
  }

  // Default/Fail-safe
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Action Unavailable</AlertTitle>
      <AlertDescription>
        You cannot perform this action in the current edition status ({status}).
      </AlertDescription>
    </Alert>
  );
}
