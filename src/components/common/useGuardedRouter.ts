"use client";

import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";

export function useGuardedRouter() {
  const router = useRouter();
  const { requestNavigation } = useUnsavedChanges();

  return {
    push: (href: string) =>
      requestNavigation({
        proceed: () => router.push(href),
      }),
    replace: (href: string) =>
      requestNavigation({
        proceed: () => router.replace(href),
      }),
    back: () =>
      requestNavigation({
        proceed: () => router.back(),
      }),
    refresh: () => router.refresh(),
  };
}
