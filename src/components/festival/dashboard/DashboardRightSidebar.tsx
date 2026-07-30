"use client";

import { Menu, Settings, User } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { LimitationCard } from "@/components/festival/dashboard/LimitationCard";
import { StatusStrip } from "@/components/festival/dashboard/StatusStrip";
import type { FestivalRole } from "@/components/festival/FestivalRoleBadge";
import { FestivalStatusBadge } from "@/components/festival/FestivalStatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { FestivalStatus } from "@/core/types/app-enums";
import { cn, getAbbreviation } from "@/core/utils/cn";

interface DashboardRightSidebarProps {
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
  festivalCreatedAt?: Date | string | null;
  festivalStartDate?: Date | string | null;
  festivalEndDate?: Date | string | null;
  festivalExpiresAt?: Date | string | null;
  daysRemaining?: number | null;
  userRole?: FestivalRole | string;
  usage?: {
    participantsCount: number;
    programmesCount: number;
    stagesCount?: number;
    storageUsedMB: number;
  };
  limits?: {
    maxParticipants: number;
    maxProgrammes: number;
    maxStages?: number;
    maxStorageMB: number;
  };
  tierLabel?: string;
  canAccessSettings?: boolean;
}

export function DashboardRightSidebar({
  festivalSlug,
  user,
  showStatusAndUsage = true,
  festivalName,
  festivalStatus,
  festivalCreatedAt,
  festivalStartDate,
  festivalEndDate,
  festivalExpiresAt,
  daysRemaining,
  userRole,
  usage,
  limits,
  tierLabel,
  canAccessSettings = true,
}: DashboardRightSidebarProps) {
  const safeUser = {
    name: user?.name || "User",
    email: user?.email || "",
    avatar: user?.image || "",
    initials: getAbbreviation(user?.name || "User"),
  };

  return (
    <Sheet>
      <SheetTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        aria-label="Open account and festival menu"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[350px] flex flex-col">
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
              {canAccessSettings && (
                <Link
                  href={`/dashboard/${festivalSlug}/settings`}
                  className="flex items-center gap-2 text-sm p-2 hover:bg-accent rounded-md transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              )}
            </div>

            {showStatusAndUsage && <Separator />}

            {/* Status Section — only for owner or super admin */}
            {showStatusAndUsage && festivalName && (
              <div className="space-y-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </h4>
                <div className="flex items-center justify-between gap-3">
                  <FestivalStatusBadge
                    status={festivalStatus || "READY"}
                    createdAt={festivalCreatedAt}
                    startDate={festivalStartDate}
                    endDate={festivalEndDate}
                    expiresAt={festivalExpiresAt}
                    size="sm"
                  />
                  {tierLabel ? (
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      Plan: {tierLabel}
                    </Badge>
                  ) : null}
                </div>
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
                    maxParticipants: limits.maxParticipants,
                    maxProgrammes: limits.maxProgrammes,
                    maxStages: limits.maxStages,
                    maxStorageMB: limits.maxStorageMB,
                  }}
                  usage={{
                    participantsCount: usage.participantsCount,
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
          <LogoutButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}
