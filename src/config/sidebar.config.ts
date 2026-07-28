import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  CreditCard,
  Edit,
  FileText,
  Gavel,
  Image,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  LifeBuoy,
  ListChecks,
  Megaphone,
  Mic2,
  Newspaper,
  QrCode,
  Radio,
  Settings,
  Shield,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";

export type FestivalRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "STAGE_MANAGER"
  | "ANNOUNCER"
  | "MEDIA"
  | "OWNER";

export const SUPER_ADMIN_SIDEBAR_ITEMS = [
  {
    title: "Dashboard",
    url: "/super-admin",
    icon: LayoutDashboard,
  },
  {
    title: "Analytics",
    url: "/super-admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Users",
    url: "/super-admin/users",
    icon: Users,
  },
  {
    title: "Festivals",
    url: "/super-admin/festivals",
    icon: Calendar,
  },
  {
    title: "Payments",
    url: "/super-admin/payments",
    icon: CreditCard,
  },
  {
    title: "Audit Logs",
    url: "/super-admin/audit-logs",
    icon: Shield,
  },
  {
    title: "Plan Features",
    url: "/super-admin/plan-features",
    icon: Layers,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
    disabled: true,
  },
];

interface SidebarItem {
  title: string;
  href: string;
  icon: any;
  allowedRoles?: FestivalRole[];
  disabled?: boolean;
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

export const getFestivalDashboardSidebarConfig = (
  basePath: string,
  role: string = "OWNER",
  plan: { useExternalJudging?: boolean; isBasic?: boolean } = {},
): SidebarGroup[] => {
  const isSuperAdmin = role === "SUPER_ADMIN";
  const normalizedRole = role as FestivalRole;
  const useExternalJudging = plan.useExternalJudging ?? false;
  // Dedicated /event-works/results is excluded for BASIC; available when external judging is enabled.
  const canUseResultsPage = useExternalJudging;
  const judgmentTitle = useExternalJudging
    ? "Judgment"
    : plan.isBasic
      ? "Scoring"
      : "Marks";
  const judgmentHref = useExternalJudging
    ? `${basePath}/event-works/judgment`
    : `${basePath}/event-works/marks`;

  const hasAccess = (allowedRoles?: FestivalRole[]) => {
    if (isSuperAdmin) return true;
    if (!allowedRoles) return true; // Public/Shared
    if (allowedRoles.includes("ADMIN") && role === "OWNER") return true; // Owner has Admin rights
    return allowedRoles.includes(normalizedRole);
  };

  const groups: SidebarGroup[] = [
    {
      title: "Dashboard", // Top level
      items: [
        {
          title: "Overview",
          href:
            normalizedRole === "STAGE_MANAGER"
              ? `${basePath}/stage-manager`
              : normalizedRole === "ANNOUNCER"
                ? `${basePath}/announcer`
                : basePath,
          icon: LayoutDashboard,
        },
        {
          title: "Settings",
          href: `${basePath}/settings`,
          icon: Settings,
          allowedRoles: ["ADMIN", "OWNER"],
        },
        {
          title: "Members",
          href: `${basePath}/members`,
          icon: Users,
          allowedRoles: ["ADMIN", "OWNER"],
          disabled: plan.isBasic,
        },
      ],
    },
    {
      title: "Pre Event Works",
      items: [
        {
          title: "Groups",
          href: `${basePath}/pre-event-works/groups`,
          icon: Building2,
          allowedRoles: ["ADMIN", "OWNER"],
        },
        {
          title: "Categories",
          href: `${basePath}/pre-event-works/categories`,
          icon: ClipboardList,
          allowedRoles: ["ADMIN", "OWNER"],
        },
        {
          title: "Students",
          href: `${basePath}/pre-event-works/students`,
          icon: UsersRound,
          allowedRoles: ["ADMIN", "OWNER"],
        },
        {
          title: "Programmes",
          href: `${basePath}/pre-event-works/programmes`,
          icon: FileText,
          allowedRoles: ["ADMIN", "OWNER"],
        },
        {
          title: "Assignment",
          href: `${basePath}/pre-event-works/assignments`,
          icon: Edit,
          allowedRoles: ["ADMIN", "OWNER"],
        },
        {
          title: "Stage Management",
          href: `${basePath}/pre-event-works/stage-management`,
          icon: Megaphone,
          allowedRoles: ["ADMIN", "OWNER", "STAGE_MANAGER"],
        },
        {
          title: "Schedule",
          href: `${basePath}/pre-event-works/schedule`,
          icon: Calendar,
          allowedRoles: ["ADMIN", "OWNER", "STAGE_MANAGER"],
        },
        {
          title: "Sessions",
          href: `${basePath}/pre-event-works/sessions`,
          icon: CalendarDays,
          allowedRoles: ["ADMIN", "OWNER", "STAGE_MANAGER"],
        },
        {
          title: "Judges",
          href: `${basePath}/pre-event-works/judges`,
          icon: Gavel,
          allowedRoles: ["ADMIN", "OWNER", "STAGE_MANAGER"],
        },
        {
          title: "Gallery",
          href: `${basePath}/content/gallery`,
          icon: Image,
          allowedRoles: ["ADMIN", "OWNER"],
        },
        {
          title: "News",
          href: `${basePath}/content/news`,
          icon: Newspaper,
          allowedRoles: ["ADMIN", "OWNER"],
        },
      ],
    },

    {
      title: "Event Works", // Renamed from "On-Event Works"
      items: [
        {
          title: "Reporting",
          href: `${basePath}/event-works/reporting`,
          icon: CheckCircle,
          allowedRoles: ["ADMIN", "OWNER", "STAGE_MANAGER"] as FestivalRole[],
        },
        {
          title: judgmentTitle,
          href: judgmentHref,
          icon: Gavel,
          allowedRoles: ["ADMIN", "OWNER", "STAGE_MANAGER"] as FestivalRole[],
        },
        {
          title: "Results",
          href: `${basePath}/event-works/results`,
          icon: ListChecks,
          allowedRoles: ["ADMIN", "OWNER", "ANNOUNCER"] as FestivalRole[],
          disabled: !canUseResultsPage,
        },
        {
          title: "Announcement",
          href: `${basePath}/event-works/announcement-desk`,
          icon: Mic2,
          allowedRoles: ["ADMIN", "OWNER", "ANNOUNCER"] as FestivalRole[],
          disabled: !canUseResultsPage,
        },
        {
          title: "Group Standings",
          href: `${basePath}/event-works/group-standings`,
          icon: UsersRound,
          allowedRoles: ["ADMIN", "OWNER", "ANNOUNCER"] as FestivalRole[],
          disabled: !canUseResultsPage,
        },
        {
          title: "Leaderboard",
          href: `${basePath}/event-works/leaderboard`,
          icon: Trophy,
          allowedRoles: ["ADMIN", "OWNER", "ANNOUNCER"] as FestivalRole[],
        },
        {
          title: "Analytics",
          href: `${basePath}/analytics`,
          icon: BarChart3,
          allowedRoles: ["ADMIN", "OWNER"] as FestivalRole[],
        },
      ],
    },
    {
      title: "Help & Support",
      items: [
        {
          title: "Documentation",
          href: `${basePath}/support/docs`,
          icon: BookOpen,
        },
      ],
    },
  ];

  // Filter groups
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => hasAccess(item.allowedRoles) && !item.disabled,
      ),
    }))
    .filter((group) => group.items.length > 0);
};
