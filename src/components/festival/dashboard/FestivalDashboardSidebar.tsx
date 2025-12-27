"use client";

import type { FestivalStatus } from "@prisma/client";
import { format } from "date-fns";
import { ExternalLink, GalleryVerticalEnd, LogOut } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
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
import { FestivalRoleBadge } from "../FestivalRoleBadge";

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

export function FestivalDashboardSidebar({
  festival,
  role,
}: FestivalDashboardSidebarProps) {
  const pathname = usePathname();
  // const params = useParams(); // Removed unused

  const basePath = `/festival/${festival.slug}`;
  const dashboardPath = basePath;

  const menuGroups = getFestivalDashboardSidebarConfig(dashboardPath, role);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-2 p-2 group-data-[collapsible=icon]:hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Role
                </span>
                <FestivalRoleBadge festivalRole={role} />
              </div>
            </div>
          </SidebarMenuItem>
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
