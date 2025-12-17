import {
  Building2,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  FolderTree,
  Gavel,
  LayoutDashboard,
  Mic2,
  MonitorPlay,
  Network,
  QrCode,
  Settings,
  UserCog,
  Users,
  UsersRound,
} from "lucide-react";

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
    title: "Settings",
    url: "#",
    icon: Settings,
    disabled: true,
  },
];

export const getFestivalDashboardSidebarConfig = (dashboardPath: string) => [
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
    items: [],
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
