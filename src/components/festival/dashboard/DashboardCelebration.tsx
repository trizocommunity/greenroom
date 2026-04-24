"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import party from "party-js";
import { useEffect } from "react";

// ── Main component ─────────────────────────────────────────────
export function DashboardCelebration() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams.get("celebrate") !== "1") return;

    // Trigger confetti celebration using party-js
    party.confetti(document.body, {
      count: 100,
      size: 2,
      speed: 15,
      spread: 360,
    });

    // Clean URL immediately (soft replace)
    const params = new URLSearchParams(searchParams.toString());
    params.delete("celebrate");
    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}
