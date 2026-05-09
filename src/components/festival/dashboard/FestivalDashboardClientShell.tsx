"use client";

import { UnsavedChangesGuard } from "@/components/common/UnsavedChangesGuard";
import { UnsavedChangesProvider } from "@/components/common/UnsavedChangesProvider";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";

export function FestivalDashboardClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isReadOnly } = useFestivalReadOnly();

  return (
    <UnsavedChangesProvider enabled={!isReadOnly}>
      <UnsavedChangesGuard />
      {children}
    </UnsavedChangesProvider>
  );
}
