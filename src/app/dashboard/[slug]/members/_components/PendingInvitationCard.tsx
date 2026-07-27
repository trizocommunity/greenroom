"use client";

import { format } from "date-fns";
import { Clock, Loader2, Mail, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { parseStoredInstant } from "@/core/utils/date-time";
import { useCancelInvitation } from "@/features/invitation/hooks/use-invitations";
import type { PendingInvitation } from "./types";

interface PendingInvitationCardProps {
  invitation: PendingInvitation;
  isOwner: boolean;
  festivalId: string;
}

export function PendingInvitationCard({
  invitation,
  isOwner,
  festivalId,
}: PendingInvitationCardProps) {
  const cancelInvitation = useCancelInvitation();
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelInvitation.mutateAsync({
        invitationId: invitation.id,
        festivalId,
      });
      toast.success("Invitation cancelled successfully");
    } catch (e) {
      toast.error("Failed to cancel invitation");
    } finally {
      setIsCancelling(false);
    }
  };

  const expiresAt = parseStoredInstant(invitation.expiresAt);
  const isExpired = invitation.status === "expired";
  const createdAt = parseStoredInstant(invitation.createdAt);

  const statusColor = isExpired ? "#ef4444" : "#3b82f6";

  return (
    <div className="group/card relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-500/30">
      {/* Accent bar removed per user request */}

      <div className="flex flex-1 flex-col pl-5 pr-4 pt-5 pb-4">
        {/* Top Header: Email + Dropdown Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col min-w-0 flex-1 pt-0.5">
            <h3
              className="font-semibold text-base leading-snug text-foreground truncate tracking-tight group-hover/card:text-blue-500 transition-colors"
              title={invitation.email}
            >
              {invitation.email}
            </h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5 font-medium flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-500/80 shrink-0" />
              Pending Invitation
            </p>
          </div>

          {!isOwner ? (
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
                  className="text-destructive focus:text-destructive cursor-pointer font-medium"
                  onSelect={handleCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <Loader2 className="h-4 w-4 mr-2.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2.5" />
                  )}
                  Cancel Invitation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {/* Middle Section: Role & Status */}
        <div className="mt-4 pt-3 border-t border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Role & Status
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <FestivalRoleBadge festivalRole={invitation.festivalRole as any} />
            <Badge
              variant="outline"
              className={
                isExpired
                  ? "bg-destructive/10 text-destructive border-destructive/30 px-2.5 py-0.5 rounded-full font-medium"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 px-2.5 py-0.5 rounded-full font-medium"
              }
            >
              <span
                className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                  isExpired
                    ? "bg-destructive"
                    : "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)] animate-pulse"
                }`}
              />
              {isExpired ? "Expired" : "Pending"}
            </Badge>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-4 flex items-center gap-4 rounded-lg bg-muted/40 px-3 py-2.5 overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">
              <span className="text-muted-foreground">Invited: </span>
              <span className="font-medium text-foreground">
                {format(createdAt, "MMM d, yyyy")}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <span className="text-sm whitespace-nowrap">
              <span className="text-muted-foreground">{isExpired ? "Expired On: " : "Expires: "}</span>
              <span className="font-medium text-foreground">
                {format(expiresAt, "MMM d, yyyy")}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
