"use client";

import { Crown, Gavel, Mic2, Shield, User, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type FestivalRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "JUDGE"
  | "TEAM-LEADER"
  | "STAGE-MANAGER"
  | "ANNOUNCER"
  | "OWNER"; // Added OWNER for the creator context

interface FestivalRoleBadgeProps {
  festivalRole: FestivalRole | string;
  className?: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

const roleConfig: Record<
  string,
  { label: string; className: string; icon: any }
> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    className:
      "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100",
    icon: Shield,
  },
  ADMIN: {
    label: "Admin",
    className: "bg-red-50 text-red-600 border-red-100 hover:bg-red-50",
    icon: Crown,
  },
  OWNER: {
    label: "Owner",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
    icon: Crown,
  },
  JUDGE: {
    label: "Judge",
    className:
      "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
    icon: Gavel,
  },
  "TEAM-LEADER": {
    label: "Team Leader",
    className:
      "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
    icon: UsersRound,
  },
  "STAGE-MANAGER": {
    label: "Stage Manager",
    className:
      "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
    icon: Mic2,
  },
  ANNOUNCER: {
    label: "Announcer",
    className: "bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-100",
    icon: Mic2,
  },
};

export function FestivalRoleBadge({
  festivalRole,
  className,
  variant = "outline",
}: FestivalRoleBadgeProps) {
  const config = roleConfig[festivalRole] || {
    label: festivalRole,
    className: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100",
    icon: User,
  };

  const Icon = config.icon;

  return (
    <Badge
      variant={variant}
      className={`font-normal whitespace-nowrap ${config.className} ${className}`}
    >
      <Icon className="w-3 h-3 mr-1.5" />
      {config.label}
    </Badge>
  );
}
