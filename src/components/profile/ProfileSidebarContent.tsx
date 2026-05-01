"use client";

import { CreditCard, LayoutDashboard, Tent } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { UserProfile } from "@/core/types/app-enums";
import { cn } from "@/core/utils/cn";
import { EditProfileDialog } from "./EditProfileDialog";

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
  ];

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* User Info */}
      <div className="flex items-center gap-3 mb-4 px-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src="" />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="overflow-hidden">
          <h1 className="text-sm font-medium truncate">{displayName}</h1>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>

      {/* Edit Profile Button */}
      <div className="px-4 mb-8">
        <EditProfileDialog user={user} />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col md:space-y-1 flex-1">
        <div className="hidden md:block mb-4 px-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Account
        </div>
        <div className="flex overflow-x-auto md:flex-col gap-2 pb-2 md:pb-0 px-4 md:px-0 snap-x scrollbar-none hide-scrollbar">
          {items.map((item) => (
            <button
              type="button"
              key={item.value}
              onClick={() => navigate(item.value)}
              className={cn(
                "flex items-center gap-2 md:gap-3 rounded-full md:rounded-md px-4 py-2 text-sm font-medium transition-colors md:w-full text-left whitespace-nowrap snap-start shrink-0",
                activeTab === item.value
                  ? "bg-primary text-primary-foreground md:bg-primary/10 md:text-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground md:bg-transparent",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
