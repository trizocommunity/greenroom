"use client";

import { Crown, Mic2, Shield, User, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type FestivalRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "TEAM-LEADER"
  | "STAGE-MANAGER"
  | "ANNOUNCER"
  | "OWNER";

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
    className: "bg-muted text-muted-foreground border-border hover:bg-muted",
    icon: Shield,
  },
  ADMIN: {
    label: "Admin",
    className:
      "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10",
    icon: Crown,
  },
  OWNER: {
    label: "Owner",
    className:
      "bg-warning/10 text-warning border-warning/20 hover:bg-warning/10",
    icon: Crown,
  },
  "TEAM-LEADER": {
    label: "Team Leader",
    className:
      "bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/10",
    icon: UsersRound,
  },
  "STAGE-MANAGER": {
    label: "Stage Manager",
    className: "bg-info/10 text-info border-info/20 hover:bg-info/10",
    icon: Mic2,
  },
  STAGE_MANAGER: {
    label: "Stage Manager",
    className: "bg-info/10 text-info border-info/20 hover:bg-info/10",
    icon: Mic2,
  },
  MEDIA: {
    label: "Media",
    className: "bg-purple/10 text-purple border-purple/20 hover:bg-purple/10",
    icon: UsersRound,
  },
  ANNOUNCER: {
    label: "Announcer",
    className: "bg-pink/10 text-pink border-pink/20 hover:bg-pink/10",
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
    className: "bg-muted text-muted-foreground border-border hover:bg-muted",
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
