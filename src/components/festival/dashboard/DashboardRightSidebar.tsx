"use client";

import type { FestivalStatus } from "@prisma/client";
import { Settings, User } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { LimitationCard } from "@/components/festival/dashboard/LimitationCard";
import { StatusStrip } from "@/components/festival/dashboard/StatusStrip";
import type { FestivalRole } from "@/components/festival/FestivalRoleBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getAbbreviation } from "@/lib/utils";

interface DashboardRightSidebarProps {
  trigger?: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  festivalSlug?: string;
  /** When false, Status and Usage & Limits sections are hidden (e.g. for non-owner / non–super-admin). */
  showStatusAndUsage?: boolean;
  // Panel Props
  festivalName?: string;
  festivalStatus?: FestivalStatus | string;
  daysRemaining?: number | null;
  userRole?: FestivalRole | string;
  usage?: {
    studentsCount: number;
    programmesCount: number;
    stagesCount?: number;
    storageUsedMB: number;
  };
  limits?: {
    maxStudents: number;
    maxProgrammes: number;
    maxStages?: number;
    maxStorageMB: number;
  };
  tierLabel?: string;
}

export function DashboardRightSidebar({
  festivalSlug,
  trigger,
  user,
  showStatusAndUsage = true,
  festivalName,
  daysRemaining,
  userRole,
  usage,
  limits,
  tierLabel,
}: DashboardRightSidebarProps) {
  const safeUser = {
    name: user?.name || "User",
    email: user?.email || "",
    avatar: user?.image || "",
    initials: getAbbreviation(user?.name || "User"),
  };

  return (
    <Sheet>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent
        side="right"
        className="w-full sm:w-[350px] p-0 flex flex-col"
      >
        <SheetHeader className="h-16 flex flex-row items-center border-b px-4 space-y-0">
          <div className="flex items-center gap-3 w-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={safeUser.avatar} alt={safeUser.name} />
              <AvatarFallback>{safeUser.initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-sm leading-tight text-left">
              <SheetTitle className="text-sm font-semibold truncate leading-none mb-1">
                {safeUser.name}
              </SheetTitle>
              <span className="text-xs text-muted-foreground truncate">
                {safeUser.email}
              </span>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Account Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Account
              </h4>
              <Link
                href="/profile"
                className="flex items-center gap-2 text-sm p-2 hover:bg-accent rounded-md transition-colors"
              >
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </Link>
              <Link
                href={`/dashboard/${festivalSlug}/settings`}
                className="flex items-center gap-2 text-sm p-2 hover:bg-accent rounded-md transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </div>

            {showStatusAndUsage && <Separator />}

            {/* Status Section — only for owner or super admin */}
            {showStatusAndUsage && festivalName && (
              <div className="space-y-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </h4>
                <StatusStrip
                  festivalName={festivalName}
                  daysRemaining={daysRemaining}
                  userRole={userRole || "Viewer"}
                  orientation="vertical"
                  compact={true}
                />
              </div>
            )}

            {showStatusAndUsage && festivalName && usage && limits && (
              <Separator />
            )}

            {/* Usage & Limits — only for owner or super admin */}
            {showStatusAndUsage && usage && limits && (
              <div className="space-y-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Usage & Limits
                </h4>
                <LimitationCard
                  tierLabel={tierLabel || "Standard"}
                  limits={{
                    maxStudents: limits.maxStudents,
                    maxProgrammes: limits.maxProgrammes,
                    maxStages: limits.maxStages,
                    maxStorageMB: limits.maxStorageMB,
                  }}
                  usage={{
                    studentsCount: usage.studentsCount,
                    programmesCount: usage.programmesCount,
                    stagesCount: usage.stagesCount,
                    storageUsedMB: usage.storageUsedMB,
                  }}
                  className="bg-transparent border-0 shadow-none p-0"
                  minimal={true}
                />
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t mt-auto">
          <LogoutButton
            variant="ghost"
            className="w-full justify-start gap-2 px-2"
            showText={true}
            showIcon={true}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
