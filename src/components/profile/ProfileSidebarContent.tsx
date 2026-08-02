"use client";

import { CreditCard, LayoutDashboard, Settings, Tent } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { UserProfile } from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";

interface ProfileSidebarContentProps {
  user?: UserProfile;
  planLabel?: string | null;
  className?: string;
  onLinkClick?: () => void;
}

export function ProfileSidebarContent({
  className,
  onLinkClick,
}: ProfileSidebarContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = searchParams.get("tab") || "overview";

  const navigate = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
    if (onLinkClick) onLinkClick();
  };

  const items = [
    {
      label: "Overview",
      value: "overview",
      icon: LayoutDashboard,
    },
    {
      label: "Billing",
      value: "billing",
      icon: CreditCard,
    },
    {
      label: "My Festivals",
      value: "festivals",
      icon: Tent,
    },
    {
      label: "Settings",
      value: "settings",
      icon: Settings,
    },
  ];

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <nav className="flex-1">
        <p className="mb-3 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:px-0">
          Account
        </p>
        {/* A hairline rail rather than a stack of pills — the active item is
            marked by a bar on the divider, so the nav reads as one object. */}
        <div className="flex flex-col md:border-l md:border-border">
          {items.map((item) => (
            <button
              type="button"
              key={item.value}
              onClick={() => navigate(item.value)}
              aria-current={activeTab === item.value ? "page" : undefined}
              className={cn(
                "relative flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors md:-ml-px md:border-l-2",
                activeTab === item.value
                  ? "text-heading md:border-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  activeTab === item.value
                    ? "text-primary"
                    : "text-muted-foreground/70",
                )}
              />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
