"use client";

import type { FestivalStatus } from "@prisma/client";
import { GalleryVerticalEnd } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { getFestivalDashboardSidebarConfig } from "@/config/sidebar.config";

interface FestivalDashboardSidebarProps {
  festival: {
    id: string;
    name: string;
    slug: string; // Used for links
    status: FestivalStatus | string;
    accentColor?: string;
    expiresAt?: Date | string | null;
  };
  role: string;
}

import { useFeatures } from "@/hooks/useFeature";

export function FestivalDashboardSidebar({
  festival,
  role,
}: FestivalDashboardSidebarProps) {
  const pathname = usePathname();
  const features = useFeatures();

  const basePath = `/dashboard/${festival.slug}`;
  const dashboardPath = basePath;

  const rawMenuGroups = getFestivalDashboardSidebarConfig(dashboardPath, role, {
    useExternalJudging: features.canManageSchedule,
  });

  // Filter menu items based on features
  const menuGroups = rawMenuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // Core features
        if (item.title === "Settings" && !features.canAccessSettings)
          return false;
        if (item.title === "Members" && !features.canManageMembers)
          return false;

        // Stage Management
        if (item.title === "Stage Management" && !features.canManageStages)
          return false;
        if (item.title === "Schedule" && !features.canManageSchedule)
          return false;
        if (
          ["Stage Navigation", "Mark Completion"].includes(item.title) &&
          !features.canManageStages
        )
          return false;

        // QR Code Features
        if (
          ["QR Codes", "Scan QR"].includes(item.title) &&
          !features.canGenerateQR
        )
          return false;

        // Analytics
        if (item.title === "Analytics" && !features.hasAdvancedAnalytics)
          return false;

        // Leaderboard (live scoreboard)
        if (item.title === "Leaderboard" && !features.hasLiveScoreboard)
          return false;

        // Content
        if (item.title === "Gallery" && !features.canManageGallery)
          return false;
        if (item.title === "News" && !features.canManageNews) return false;
        if (item.title === "Sessions" && !features.canManageSchedule)
          return false;

        // Reporting is stage-driven (mark / reporting sessions). Schedule is
        // required for external judge links, but reporting itself should follow
        // the stage-management capability.
        if (item.title === "Reporting" && !features.canManageStages)
          return false;

        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={true} size="lg" asChild>
              <Link href={dashboardPath}>
                <div
                  className="flex aspect-square size-9 items-center justify-center rounded-lg text-sidebar-primary-foreground"
                  style={{ backgroundColor: festival.accentColor }}
                >
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold capitalize">
                    {festival.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {role} View
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.title || "main"}>
            {group.title && group.items.length > 0 && (
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>{/* Footer actions moved to Right Panel */}</SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
