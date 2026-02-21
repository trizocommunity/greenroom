import {
  BarChart3,
  Building2,
  Calendar,
  CheckCircle,
  ClipboardList,
  CreditCard,
  Edit,
  FileText,
  LayoutDashboard,
  Megaphone,
  QrCode,
  Settings,
  Shield,
  Trophy,
  Users,
  UsersRound,
  BookOpen,
  LifeBuoy,
} from "lucide-react";

export type FestivalRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "JUDGE"
  | "STAGE_MANAGER"
  | "ANNOUNCER"
  | "OWNER";

export const SUPER_ADMIN_SIDEBAR_ITEMS = [
  {
    title: "Dashboard",
    url: "/super-admin",
    icon: LayoutDashboard,
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
    title: "Support",
    url: "/super-admin/support",
    icon: LifeBuoy,
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
): SidebarGroup[] => {
  const isSuperAdmin = role === "SUPER_ADMIN";
  const normalizedRole = role as FestivalRole;

  const hasAccess = (allowedRoles?: FestivalRole[]) => {
    if (isSuperAdmin) return true;
    if (!allowedRoles) return true; // Public/Shared
    if (allowedRoles.includes("ADMIN") && role === "OWNER") return true; // Owner has Admin rights
    return allowedRoles.includes(normalizedRole);
  };

  const groups: SidebarGroup[] = [
    {
      title: "", // Top level
      items: [
        {
          title: "Dashboard",
          href: basePath,
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
        },
      ],
    },
    {
      title: "Pre-Works",
      items: [
        {
          title: "Categories",
          href: `${basePath}/pre-works/categories`,
          icon: ClipboardList,
          allowedRoles: ["ADMIN", "OWNER"],
        },
        {
          title: "Groups",
          href: `${basePath}/pre-works/groups`,
          icon: Building2,
          allowedRoles: ["ADMIN", "OWNER"],
        },
        {
          title: "Students",
          href: `${basePath}/pre-works/students`,
          icon: UsersRound,
          allowedRoles: ["ADMIN", "OWNER"],
        },
        {
          title: "Programmes",
          href: `${basePath}/pre-works/programmes`,
          icon: FileText,
          allowedRoles: ["ADMIN", "OWNER"],
        },
        {
          title: "Assignment",
          href: `${basePath}/pre-works/assignments`,
          icon: Edit,
          allowedRoles: ["ADMIN", "OWNER"],
        },
        // Merged items from old "Event Works"
        {
          title: "Chest Numbers",
          href: `${basePath}/pre-works/chest-numbers`,
          icon: CreditCard,
          allowedRoles: ["ADMIN", "OWNER"],
        },
        {
          title: "QR Codes",
          href: `${basePath}/pre-works/qr-codes`,
          icon: QrCode,
          allowedRoles: ["ADMIN", "OWNER", "STAGE_MANAGER"] as FestivalRole[],
        },
        {
          title: "Stage Management",
          href: `${basePath}/pre-works/stage-management`,
          icon: Megaphone,
          allowedRoles: ["ADMIN", "OWNER", "STAGE_MANAGER"],
        },
        {
          title: "Schedule",
          href: `${basePath}/pre-works/schedule`,
          icon: Calendar,
          allowedRoles: ["ADMIN", "OWNER", "STAGE_MANAGER"],
        },
      ],
    },

    {
      title: "Event Works", // Renamed from "On-Event Works"
      items: [
        {
          title: "Results",
          href: `${basePath}/event-works/results`,
          icon: ClipboardList,
          allowedRoles: [
            "ADMIN",
            "OWNER",
            "JUDGE",
            "ANNOUNCER",
          ] as FestivalRole[],
        },
        {
          title: "Leaderboard",
          href: `${basePath}/event-works/leaderboard`,
          icon: Trophy,
          allowedRoles: [
            "ADMIN",
            "OWNER",
            "JUDGE",
            "ANNOUNCER",
          ] as FestivalRole[],
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
        {
          title: "My Tickets",
          href: `${basePath}/support/tickets`,
          icon: LifeBuoy,
        },
      ],
    },
  ];

  // Filter groups
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasAccess(item.allowedRoles)),
    }))
    .filter((group) => group.items.length > 0);
};
