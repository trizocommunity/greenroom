"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { getFestivalDashboardSidebarConfig } from "@/config/sidebar.config";
import type { FestivalStatus } from "@/core/types/app-enums";

interface FestivalDashboardSidebarProps {
  festival: {
    id: string;
    name: string;
    slug: string;
    status: FestivalStatus | string;
    accentColor?: string;
    expiresAt?: Date | string | null;
  };
  role: string;
  /** The user's actual/original role before any switch */
  actualRole: string;
  /** All roles this member is assigned to */
  memberRoles: string[];
  /** Whether the current view is a switched role */
  isSwitchedRole: boolean;
}

import { RoleSwitcher } from "@/components/festival/dashboard/RoleSwitcher";
import { useFestival } from "@/components/festival/FestivalContext";
import {
  useFeatures,
  useFeatureTag,
} from "@/features/plan-features/hooks/use-feature";

export function FestivalDashboardSidebar({
  festival,
  role,
  actualRole,
  memberRoles,
  isSwitchedRole,
}: FestivalDashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const { requestNavigation } = useUnsavedChanges();
  const features = useFeatures();
  const canUseExternalJudging = useFeatureTag("eventWorks.externalJudging");
  const canUseMarksUI = useFeatureTag("eventWorks.marksUI");
  const canUseReporting = useFeatureTag("eventWorks.reporting");

  const basePath = `/dashboard/${festival.slug}`;
  const dashboardPath = basePath;

  const festivalContext = useFestival();
  const isBasic = festivalContext.tier === "BASIC";

  const rawMenuGroups = getFestivalDashboardSidebarConfig(dashboardPath, role, {
    useExternalJudging: canUseExternalJudging,
    isBasic,
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
        if (item.title === "Media" && !features.canManageMedia) return false;
        if (item.title === "News" && !features.canManageNews) return false;
        if (item.title === "Exports" && !features.canExport) return false;
        if (item.title === "Sessions" && !features.canManageSchedule)
          return false;

        // Reporting is stage-driven (mark / reporting sessions). Schedule is
        // required for external judge links, but reporting itself should follow
        // the stage-management capability.
        if (item.title === "Reporting" && !canUseReporting) return false;

        // "Judgement/Scoring" is business-capability routed:
        // - BASIC: Scoring UI (/event-works/marks)
        // - STANDARD/PRO: Judgement UI (external judging)
        // If Super Admin disables the underlying capability(s), hide the link to
        // avoid unreachable redirects.
        if (
          (item.href.endsWith("/event-works/judgement") ||
            item.href.endsWith("/event-works/marks")) &&
          !canUseExternalJudging &&
          !canUseMarksUI
        ) {
          return false;
        }

        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const onNavClick = (e: React.MouseEvent, href: string) => {
    if (!isMobile) return;
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    requestNavigation({
      proceed: () => {
        setOpenMobile(false);
        router.push(href);
      },
    });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <RoleSwitcher
          festivalId={festival.id}
          festivalSlug={festival.slug}
          festivalName={festival.name}
          accentColor={festival.accentColor}
          actualRole={actualRole}
          activeRole={role}
          memberRoles={memberRoles}
          isSwitched={isSwitchedRole}
        />
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
                        <Link
                          href={item.href}
                          onClick={(e) => onNavClick(e, item.href)}
                        >
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
