"use client";

import { Settings, User, ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FestivalStatus } from "@prisma/client";

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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getAbbreviation } from "@/lib/utils";
import { LimitationCard } from "@/components/festival/dashboard/LimitationCard";
import { StatusStrip } from "@/components/festival/dashboard/StatusStrip";
import type { FestivalRole } from "@/components/festival/FestivalRoleBadge";

interface DashboardRightSidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  festivalSlug?: string;
  // Panel Props
  festivalName?: string;
  festivalStatus?: FestivalStatus | string;
  daysRemaining?: number | null;
  userRole?: FestivalRole | string;
  usage?: {
    studentsCount: number;
    programmesCount: number;
    sessionsCount?: number;
    storageUsedMB: number;
  };
  limits?: {
    maxStudents: number;
    maxProgrammes: number;
    maxSessions?: number;
    maxStorageMB: number;
  };
  tierLabel?: string;
}

export function DashboardRightSidebar({
  user,
  festivalName,
  daysRemaining,
  userRole,
  usage,
  limits,
  tierLabel,
}: DashboardRightSidebarProps) {
  const safeUser = {
    name: user?.name || "User",
    email: user?.email || "",
    avatar: user?.image || "",
    initials: getAbbreviation(user?.name || "User"),
  };

  return (
    <Sidebar side="right" collapsible="icon" className="border-l">
      <SidebarHeader className="h-14 flex items-center justify-center border-b px-2">
        <div className="flex items-center gap-2 w-full group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-8 w-8">
            <AvatarImage src={safeUser.avatar} alt={safeUser.name} />
            <AvatarFallback>{safeUser.initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-semibold truncate">{safeUser.name}</span>
            <span className="text-xs text-muted-foreground truncate">
              {safeUser.email}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="">
        {/* Status Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="My Profile">
                  <Link href="/profile">
                    <User className="h-4 w-4" />
                    <span>My Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {festivalName && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Status</SidebarGroupLabel>
            <SidebarGroupContent className=" px-2 pt-2">
              <StatusStrip
                festivalName={festivalName}
                daysRemaining={daysRemaining}
                userRole={userRole || "Viewer"}
                orientation="vertical"
                compact={true}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Usage Section */}
        {usage && limits && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Usage</SidebarGroupLabel>
            <SidebarGroupContent className="pt-2 px-2">
              <LimitationCard
                tierLabel={tierLabel || "Standard"}
                limits={limits}
                usage={usage}
                className="bg-transparent border-0 shadow-none p-0"
                minimal={true}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <LogoutButton
              variant="ghost"
              className="w-full justify-start gap-2 px-2.5"
              showText={true}
              showIcon={true}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
