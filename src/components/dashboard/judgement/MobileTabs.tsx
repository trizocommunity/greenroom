"use client";

import { cn } from "@/core/utils/cn";

const MOBILE_TABS = ["completed", "rejudge"] as const;
export type MobileTab = (typeof MOBILE_TABS)[number];

/**
 * Tabs visible on mobile only — desktop shows completed and rejudge side by
 * side. The label text mirrors the original two-button strip.
 */
export function MobileTabs({
  mobileTab,
  onChange,
}: {
  mobileTab: MobileTab;
  onChange: (t: MobileTab) => void;
}) {
  return (
    <div className="sm:hidden flex bg-muted rounded-lg p-1 my-6">
      {MOBILE_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            "flex-1 text-sm font-medium py-1.5 rounded-md transition-all",
            mobileTab === tab
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground",
          )}
        >
          {tab === "completed" ? "Completed" : "Rejudge"}
        </button>
      ))}
    </div>
  );
}
