"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle, FolderArchive, Lock } from "lucide-react";
import type { EditionStatus } from "@prisma/client";

interface EditionStatusBadgeProps {
  status: EditionStatus;
  className?: string;
  size?: "sm" | "default";
}

export function EditionStatusBadge({
  status,
  className = "",
  size = "default",
}: EditionStatusBadgeProps) {
  const sizeClasses = size === "sm" ? "text-xs px-1.5 py-0" : "px-2 py-0.5";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  switch (status) {
    case "ACTIVE":
      return (
        <Badge
          variant="secondary"
          className={`bg-green-100 text-green-700 border-green-200 hover:bg-green-100 gap-1.5 ${sizeClasses} ${className}`}
        >
          <CheckCircle className={iconSize} />
          Active
        </Badge>
      );
    case "FREEZE":
      return (
        <Badge
          variant="secondary"
          className={`bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 gap-1.5 ${sizeClasses} ${className}`}
        >
          <Lock className={iconSize} />
          Frozen
        </Badge>
      );
    case "ARCHIVED":
      return (
        <Badge
          variant="secondary"
          className={`bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100 gap-1.5 ${sizeClasses} ${className}`}
        >
          <FolderArchive className={iconSize} />
          Archived
        </Badge>
      );
    default:
      return null;
  }
}
