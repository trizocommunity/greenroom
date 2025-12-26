import {
  BarChart3,
  Calendar,
  ClipboardList,
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
} from "lucide-react";

export type FestivalRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "JUDGE"
  | "TEAM-LEADER"
  | "STAGE-MANAGER"
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
    title: "Editions",
    url: "/super-admin/editions",
    icon: FileText,
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
    title: "Settings",
    url: "#",
    icon: Settings,
    disabled: true,
  },
];

// Re-import CreditCard which was missing in the replacement content above?
// Ah, I see I missed adding it to the imports. Let me fix the imports in the replacement content below.
// Wait, I can't self-correct in the tool call description. I will just execute it correctly.
import { CreditCard } from "lucide-react";

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
  isEditionView: boolean = false,
): SidebarGroup[] => {
  const isSuperAdmin = role === "SUPER_ADMIN";
  const normalizedRole = role as FestivalRole;

  const hasAccess = (allowedRoles?: FestivalRole[]) => {
    if (isSuperAdmin) return true;
    if (!allowedRoles) return true; // Public/Shared
    if (allowedRoles.includes("ADMIN") && role === "OWNER") return true; // Owner has Admin rights
    return allowedRoles.includes(normalizedRole);
  };

  if (!isEditionView) {
    // FESTIVAL OVERVIEW MODE (Simplified for now)
    return [
      {
        title: "Overview",
        items: [
          {
            title: "Dashboard",
            href: basePath,
            icon: LayoutDashboard,
          },
        ],
      },
      {
        title: "Settings",
        items: [
          {
            title: "General Settings",
            href: `${basePath}/settings`,
            icon: Settings,
            allowedRoles: ["OWNER", "ADMIN"] as FestivalRole[],
          },
        ].filter((i) => hasAccess(i.allowedRoles)),
      },
    ];
  }

  // EDITION DASHBOARD MODE
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
          allowedRoles: ["ADMIN", "OWNER"] as FestivalRole[],
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
          title: "Programmes",
          href: `${basePath}/pre-works/programmes`,
          icon: FileText,
          allowedRoles: ["ADMIN", "OWNER"],
        },
        {
          title: "Groups",
          href: `${basePath}/pre-works/groups`,
          icon: Building2,
          allowedRoles: ["ADMIN", "OWNER"],
        },
        {
          title: "Participants",
          href: `${basePath}/pre-works/participants`,
          icon: UsersRound,
          allowedRoles: ["ADMIN", "OWNER", "TEAM-LEADER"],
        },
        {
          title: "Programme Assignment",
          href: `${basePath}/pre-works/assignments`,
          icon: Edit,
          allowedRoles: ["ADMIN", "OWNER", "TEAM-LEADER"],
        },
      ],
    },
    {
      title: "Event Works",
      items: [
        {
          title: "Chest Numbers",
          href: `${basePath}/chest-numbers`,
          icon: CreditCard, // Placeholder
          allowedRoles: ["ADMIN", "OWNER"],
        },
        {
          title: "QR Codes",
          href: `${basePath}/qr-codes`,
          icon: QrCode,
          allowedRoles: ["ADMIN", "OWNER", "STAGE-MANAGER"] as FestivalRole[],
        },
        {
          title: "Stage Management",
          href: `${basePath}/stage-management`,
          icon: Megaphone,
          allowedRoles: ["ADMIN", "OWNER", "STAGE-MANAGER"],
        },
        {
          title: "Schedule",
          href: `${basePath}/schedule`,
          icon: Calendar,
          allowedRoles: ["ADMIN", "OWNER", "STAGE-MANAGER"],
        },
      ],
    },
    {
      title: "On-Event Works",
      items: [
        {
          title: "Scan QR",
          href: `${basePath}/scan`,
          icon: QrCode,
          allowedRoles: [
            "ADMIN",
            "OWNER",
            "JUDGE",
            "STAGE-MANAGER",
          ] as FestivalRole[],
        },
        {
          title: "Coding/decoding",
          href: `${basePath}/coding`,
          icon: Shield,
          allowedRoles: ["ADMIN", "OWNER", "JUDGE"] as FestivalRole[],
        },
        {
          title: "Mark Completion",
          href: `${basePath}/completion`,
          icon: CheckCircle,
          allowedRoles: ["ADMIN", "OWNER", "STAGE-MANAGER"],
        },
        {
          title: "Stage Navigation",
          href: `${basePath}/stages`,
          icon: Megaphone,
          allowedRoles: [
            "ADMIN",
            "OWNER",
            "JUDGE",
            "STAGE-MANAGER",
            "ANNOUNCER",
          ] as FestivalRole[],
        },
      ],
    },
    {
      title: "Summary & Results",
      items: [
        {
          title: "Results",
          href: `${basePath}/results`,
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
  ];

  // Filter groups
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasAccess(item.allowedRoles)),
    }))
    .filter((group) => group.items.length > 0);
};

// Import missing icons
import { Building2, CheckCircle } from "lucide-react";
