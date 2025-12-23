import {
  Building2,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Gavel,
  LayoutDashboard,
  Settings,
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

// Revised config that takes basePath as argument or handles routing structure better.
// The current implementation takes 'dashboardPath' which is `/festival/id/dashboard`.
// But editions is at `/festival/id/editions`.
// So we need to pass basePath or strip 'dashboard' from dashboardPath.

export const getFestivalDashboardSidebarConfig = (
  basePath: string, // This is now the ROOT for the links (e.g. /festival/id or /festival/id/edition-slug)
  role: string = "OWNER",
  isEditionView: boolean = false,
) => {
  const isSuperAdmin = role === "SUPER_ADMIN";

  const hasAccess = (allowedRoles?: string[]) => {
    if (isSuperAdmin) return true;
    if (!allowedRoles) return true;
    return allowedRoles.includes(role);
  };

  if (!isEditionView) {
    // FESTIVAL OVERVIEW MODE
    return [
      {
        title: "Overview",
        items: [
          {
            title: "Dashboard",
            href: basePath, // /festival/id
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
            allowedRoles: ["OWNER"],
          },
        ].filter((i) => hasAccess(i.allowedRoles)),
      },
    ];
  }

  // EDITION DASHBOARD MODE
  return [
    {
      title: "Edition",
      items: [
        {
          title: "Dashboard",
          href: basePath, // /festival/id/edition-slug
          icon: LayoutDashboard,
        },
        {
          title: "Settings",
          href: `${basePath}/settings`,
          icon: Settings,
        },
      ],
    },
    {
      title: "Management",
      items: [
        {
          title: "Participants",
          href: `${basePath}/participants`,
          icon: UsersRound,
        },
        {
          title: "Judges",
          href: `${basePath}/judges`,
          icon: Gavel,
        },
        {
          title: "Events/Programmes",
          href: `${basePath}/programmes`,
          icon: FileText,
        },
      ],
    },
    {
      title: "Event Works",
      items: [
        {
          title: "Schedule",
          href: `${basePath}/schedule`,
          icon: Clock,
        },
      ],
    },
    {
      title: "Back",
      items: [
        {
          title: "Back to Festival",
          href: basePath.split("/").slice(0, 3).join("/"), // Hacky: Go to /festival/[id]
          icon: Building2, // Icon
        },
      ],
    },
  ];
};
