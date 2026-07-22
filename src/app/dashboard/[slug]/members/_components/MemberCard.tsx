"use client";

import { format } from "date-fns";
import { Eye, Loader2, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRemoveMember } from "@/api/client/members";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { parseStoredInstant } from "@/core/utils/date-time";
import { MemberDetailsDialog } from "./MemberDetailsDialog";
import type { Member } from "./types";

interface MemberCardProps {
  member: Member;
  festivalId: string;
  isOwner: boolean;
  isReadOnly: boolean;
}

export function MemberCard({
  member,
  festivalId,
  isOwner,
  isReadOnly,
}: MemberCardProps) {
  const removeMember = useRemoveMember();
  const [isRevoking, setIsRevoking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      await removeMember.mutateAsync({ festivalId, memberId: member.id });
      toast.success("Member removed successfully");
    } catch (e) {
      toast.error("Error removing member");
    } finally {
      setIsRevoking(false);
    }
  };

  const fullName = member.user?.fullName || member.fullName || "Unknown";
  const email = member.user?.email || member.email || "";
  const joinedAt = parseStoredInstant(member.createdAt);
  const avatarUrl =
    (member.user as any)?.image || (member.user as any)?.avatarUrl;
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const statusColor = member.isActive ? "#10b981" : "#f59e0b";

  return (
    <div className="group/card relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
      {/* Color accent bar on the left */}
      <div
        className="absolute left-0 top-0 h-full w-1.5 shrink-0 transition-all duration-300 group-hover/card:w-2"
        style={{ backgroundColor: statusColor }}
      />

      <div className="flex flex-1 flex-col pl-5 pr-4 pt-5 pb-4">
        {/* Top Header: Avatar + Name/Email + Dropdown Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Avatar className="h-11 w-11 shrink-0 rounded-full border-2 border-background shadow-sm ring-2 ring-primary/10 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-semibold text-primary transition-transform duration-300 group-hover/card:scale-105">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
              <AvatarFallback className="bg-transparent text-sm font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3
                className="font-semibold text-base leading-snug text-foreground truncate tracking-tight group-hover/card:text-primary transition-colors cursor-pointer"
                onClick={() => setShowDetails(true)}
                title={fullName}
              >
                {fullName}
              </h3>
              <p
                className="text-xs text-muted-foreground truncate mt-0.5 font-medium"
                title={email}
              >
                {email}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 rounded-xl shadow-lg border-border/80"
            >
              <DropdownMenuItem
                onSelect={() => setShowDetails(true)}
                className="cursor-pointer font-medium"
              >
                <Eye className="h-4 w-4 mr-2.5 text-muted-foreground" />
                View Details
              </DropdownMenuItem>
              {!isOwner && !isReadOnly ? (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer font-medium"
                  onSelect={handleRevoke}
                  disabled={isRevoking}
                >
                  {isRevoking ? (
                    <Loader2 className="h-4 w-4 mr-2.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2.5" />
                  )}
                  Remove Member
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Middle Section: Role & Status */}
        <div className="mt-4 pt-3 border-t border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Role & Status
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <FestivalRoleBadge festivalRole={member.role as any} />
            <Badge
              variant="outline"
              className={
                member.isActive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-2.5 py-0.5 rounded-full font-medium transition-colors"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 px-2.5 py-0.5 rounded-full font-medium transition-colors"
              }
            >
              <span
                className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                  member.isActive
                    ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse"
                    : "bg-amber-500"
                }`}
              />
              {member.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        {/* Bottom Bento Box: Joined Date + Access Status */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-center rounded-xl border border-border/50 bg-muted/30 dark:bg-muted/15 p-2.5 transition-colors group-hover/card:bg-muted/50">
          <div className="border-r border-border/40 pr-2">
            <p className="text-xs font-bold leading-none text-foreground mt-0.5">
              {format(joinedAt, "MMM d, yyyy")}
            </p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
              Joined
            </p>
          </div>
          <div className="pl-2">
            <p className="text-xs font-bold leading-none text-foreground mt-0.5">
              {member.isActive ? "Full Access" : "Disabled"}
            </p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
              Access Status
            </p>
          </div>
        </div>
      </div>

      <MemberDetailsDialog
        member={member}
        open={showDetails}
        onOpenChange={setShowDetails}
      />
    </div>
  );
}
