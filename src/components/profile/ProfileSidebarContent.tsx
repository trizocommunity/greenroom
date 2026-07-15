"use client";

import { CreditCard, LayoutDashboard, Settings, Tent } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { UserProfile } from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";

interface ProfileSidebarContentProps {
  user: UserProfile;
  planLabel?: string | null;
  className?: string;
  onLinkClick?: () => void;
}

export function ProfileSidebarContent({
  user,
  className,
  onLinkClick,
}: ProfileSidebarContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = searchParams.get("tab") || "overview";

  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : user.email.substring(0, 2).toUpperCase();

  const displayName =
    user.displayName || user.fullName || user.email.split("@")[0];

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
    <div className={cn("flex flex-col h-full", className)}>
      {/* User Info & Avatar Header */}
      <div className="flex flex-col items-start gap-4 mb-6 px-4 md:px-0">
        <Avatar className="h-20 w-20 border border-border shadow-sm">
          <AvatarImage src="" />
          <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Name, Email & Badge */}
        <div className="space-y-1 w-full">
          <h1 className="text-base font-bold tracking-tight text-foreground truncate">
            {displayName}
          </h1>
          <p className="text-xs font-medium text-muted-foreground truncate">
            {user.email}
          </p>

          {user.accountType && (
            <div className="pt-1.5">
              <Badge
                variant="outline"
                className={cn(
                  "text-[11px] font-semibold px-2.5 py-0.5",
                  user.accountType === "INSTITUTIONAL"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {user.accountType}
              </Badge>
              {user.accountType === "PERSONAL" && (
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                  Upgrade to Institutional for campus features
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-1 flex-1">
        <div className="mb-4 px-4 md:px-0 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Account
        </div>
        <div className="flex flex-col space-y-1 px-2 md:px-0">
          {items.map((item) => (
            <button
              type="button"
              key={item.value}
              onClick={() => navigate(item.value)}
              className={cn(
                "flex items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition-colors w-full text-left",
                activeTab === item.value
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
        <div className="md:hidden mt-auto pt-6 px-4 border-t border-border/50">
          <LogoutButton />
        </div>
      </nav>
    </div>
  );
}
