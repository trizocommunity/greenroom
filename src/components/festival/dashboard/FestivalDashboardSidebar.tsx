"use client";

import type { FestivalStatus } from "@prisma/client";
import { format } from "date-fns";
import { ExternalLink, GalleryVerticalEnd, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
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
    slug: string; // Used for links, can be ID
    status: FestivalStatus | string;
    accentColor?: string;
    expiresAt?: Date | string | null;
  };
  role: string;
  hasActiveEdition?: boolean;
}

export function FestivalDashboardSidebar({
  festival,
  role,
  hasActiveEdition = false,
}: FestivalDashboardSidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const editionSlug = params?.editionSlug as string | undefined;

  // Base Path Logic
  // If editionSlug exists, base is /festival/[id]/[editionSlug]
  // Else /festival/[id]
  const basePath = `/festival/${festival.slug}`; // festival.slug is ID here
  const dashboardPath = editionSlug ? `${basePath}/${editionSlug}` : basePath; // Root dashboard

  const menuGroups = getFestivalDashboardSidebarConfig(
    dashboardPath,
    role,
    !!editionSlug,
  );

  // Phase 2: Execution Visibility Guards
  const protectedItems = ["Participants", "Events", "Judges", "Results"];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={dashboardPath}>
                <div
                  className="flex aspect-square size-10 items-center justify-center rounded-lg text-sidebar-primary-foreground"
                  style={{ backgroundColor: festival.accentColor }}
                >
                  <GalleryVerticalEnd className="size-5" />
                </div>
                <div className="flex flex-col gap-1 leading-none">
                  <span className="font-semibold truncate">
                    {festival.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <FestivalRoleBadge
                      festivalRole={
                        role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN"
                      }
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
                      const isProtected = protectedItems.includes(item.title);
                      const isDisabled = isProtected && !hasActiveEdition;

                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild={!isDisabled}
                            isActive={isActive}
                            tooltip={
                              isDisabled
                                ? "Create an active edition to start execution."
                                : item.title
                            }
                            className={
                              isDisabled
                                ? "opacity-50 cursor-not-allowed group-hover:bg-transparent"
                                : ""
                            }
                          >
                            {/* If disabled, render as div/span, else Link */}
                            {isDisabled ? (
                              <div className="flex items-center gap-2">
                                <item.icon />
                                <span>{item.title}</span>
                              </div>
                            ) : (
                              <Link href={item.href}>
                                <item.icon />
                                <span>{item.title}</span>
                              </Link>
                            )}
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
              <Link href={`/${festival.slug}`} target="_blank">
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
