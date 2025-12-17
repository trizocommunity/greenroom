"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, 
  Settings, 
  Trophy, 
  Calendar, 
  LayoutDashboard,
  LogOut,
  ExternalLink,
  GalleryVerticalEnd,
  UserCog,
  Gavel,
  Mic2,
  UsersRound,
  FolderTree,
  FileText,
  Building2,
  Network,
  MonitorPlay,
  Clock,
  QrCode,
} from "lucide-react";
import { Festival } from "@prisma/client";
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

interface FestivalDashboardSidebarProps {
  festival: Pick<Festival, "name" | "slug" | "accentColor" | "id">;
}

export function FestivalDashboardSidebar({ festival }: FestivalDashboardSidebarProps) {
  const pathname = usePathname();
  const basePath = `/festival/${festival.slug}`;
  const dashboardPath = `${basePath}/dashboard`;

  const menuGroups = [
    {
      title: "Overview",
      items: [
        {
          title: "Dashboard",
          href: dashboardPath,
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "Pre-works",
      items: [
        {
          title: "Team Leaders",
          href: `${dashboardPath}/team-leaders`,
          icon: UserCog,
        },
        {
          title: "Judges",
          href: `${dashboardPath}/judges`,
          icon: Gavel,
        },
        {
          title: "Stage Managers",
          href: `${dashboardPath}/stage-managers`,
          icon: Mic2,
        },
        {
          title: "Participants",
          href: `${dashboardPath}/participants`,
          icon: UsersRound,
        },
        {
          title: "Categories",
          href: `${dashboardPath}/categories`,
          icon: FolderTree,
        },
        {
          title: "Programmes",
          href: `${dashboardPath}/programmes`,
          icon: FileText,
        },
        {
          title: "Colleges/Schools",
          href: `${dashboardPath}/colleges`,
          icon: Building2,
        },
        {
          title: "Groups",
          href: `${dashboardPath}/groups`,
          icon: Network,
        },
      ],
    },
    {
      title: "Event Works",
      items: [
        {
          title: "Stages",
          href: `${dashboardPath}/stages`,
          icon: MonitorPlay,
        },
        {
          title: "Schedule",
          href: `${dashboardPath}/schedule`,
          icon: Clock,
        },
        {
          title: "Chest Numbers & QR",
          href: `${dashboardPath}/chest-numbers`,
          icon: QrCode,
        },
      ],
    },
    {
      title: "On-event Works",
      items: [
        // To be extended later
      ],
    },
    {
      title: "Settings",
      items: [
        {
          title: "Festival Settings",
          href: `${dashboardPath}/settings`,
          icon: Settings,
        },
      ],
    },
  ];

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
                  <span className="font-semibold truncate">{festival.name}</span>
                  <span className="text-xs">Dashboard</span>
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

