"use client";

import type { Festival } from "@prisma/client";
import { format } from "date-fns";
import { ExternalLink, GalleryVerticalEnd, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FestivalStatusBadge } from "@/components/festival/FestivalStatusBadge";
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
  festival: Pick<
    Festival,
    "name" | "slug" | "accentColor" | "id" | "status" | "expiresAt"
  >;
}

export function FestivalDashboardSidebar({
  festival,
}: FestivalDashboardSidebarProps) {
  const pathname = usePathname();
  const basePath = `/festival/${festival.slug}`;
  const dashboardPath = `${basePath}/dashboard`;

  const menuGroups = getFestivalDashboardSidebarConfig(dashboardPath);
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={dashboardPath}>
                <div
                  className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground"
                  style={{ backgroundColor: festival.accentColor }}
                >
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold truncate">
                    {festival.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <FestivalStatusBadge
                      status={festival.status}
                      expiresAt={festival.expiresAt}
                      size="sm"
                    />
                  </div>
                  {festival.expiresAt && (
                    <span className="text-[10px] text-muted-foreground">
                      Valid until:{" "}
                      {format(new Date(festival.expiresAt), "dd/MM/yyyy")}
                    </span>
                  )}
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.title}>
            {group.items.length > 0 && (
              <>
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
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
              </>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="View Public Site">
              <Link href={basePath}>
                <ExternalLink />
                <span>View Public Site</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Exit to Main App">
              <Link href="/profile">
                <LogOut />
                <span>Exit to Main App</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
