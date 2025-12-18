"use client";

import { cn } from "@/lib/utils";
import { LayoutDashboard, Calendar, CreditCard, Settings } from "lucide-react";

interface ProfileSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

export function ProfileSidebar({
  activeTab,
  onTabChange,
  className,
}: ProfileSidebarProps) {
  const items = [
    {
      label: "Dashboard",
      value: "dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Festivals",
      value: "festivals",
      icon: Calendar,
    },
    {
      label: "Billing",
      value: "billing",
      icon: CreditCard,
    },
    {
      label: "Settings",
      value: "settings",
      icon: Settings,
    },
  ];

  return (
    <nav className={cn("flex flex-col space-y-1", className)}>
      <div className="mb-4 px-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
        Account
      </div>
      {items.map((item) => (
        <button
          type="button"
          key={item.value}
          onClick={() => onTabChange(item.value)}
          className={cn(
            "flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === item.value
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </button>
      ))}
    </nav>
  );
}
