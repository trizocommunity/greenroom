"use client";

import { Crown, Gavel, Mic2, Shield, User, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type FestivalRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "JUDGE"
  | "PARTICIPANT"
  | "TEAM-LEADER"
  | "STAGE-MANAGER"
  | "OWNER"; // Added OWNER for the creator context

interface FestivalRoleBadgeProps {
  role: FestivalRole | string;
  className?: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

const roleConfig: Record<
  string,
  { label: string; className: string; icon: any }
> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
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
  PARTICIPANT: {
    label: "Participant",
    className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
    icon: User,
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
};

export function FestivalRoleBadge({
  role,
  className,
  variant = "outline",
}: FestivalRoleBadgeProps) {
  const config = roleConfig[role] || {
    label: role,
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
