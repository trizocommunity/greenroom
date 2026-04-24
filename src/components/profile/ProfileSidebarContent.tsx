"use client";

import type { UserProfile } from "@/lib/app-enums";
import { CreditCard, LayoutDashboard, Tent } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
      <nav className="flex flex-col space-y-1 flex-1">
        <div className="mb-4 px-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Account
        </div>
        {items.map((item) => (
          <button
            type="button"
            key={item.value}
            onClick={() => navigate(item.value)}
            className={cn(
              "flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors w-full text-left",
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
    </div>
  );
}
