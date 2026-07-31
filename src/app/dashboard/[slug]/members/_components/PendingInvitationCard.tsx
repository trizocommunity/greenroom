"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Clock,
  Loader2,
  Mail,
  MoreVertical,
  RotateCw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, parseInstant } from "@/core/datetime";
import {
  useCancelInvitation,
  useResendInvitation,
} from "@/features/invitation/hooks/use-invitations";
import type { PendingInvitation } from "./types";

interface PendingInvitationCardProps {
  invitation: PendingInvitation;
  isOwner: boolean;
  festivalId: string;
  isReadOnly?: boolean;
}

export function PendingInvitationCard({
  invitation,
  isOwner: _isOwner,
  festivalId,
  isReadOnly = false,
}: PendingInvitationCardProps) {
  const cancelInvitation = useCancelInvitation();
  const resendInvitation = useResendInvitation();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const displayTz = useDisplayTimezone();

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

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendInvitation.mutateAsync({
        invitationId: invitation.id,
        festivalId,
      });
    } finally {
      setIsResending(false);
    }
  };

  const expiresAt = parseInstant(invitation.expiresAt);
  const isExpired = invitation.status === "expired";
  const createdAt = parseInstant(invitation.createdAt);
  const expiryRelative =
    expiresAt != null
      ? formatDistanceToNow(expiresAt, { addSuffix: true })
      : "—";

  return (
    <div className="group/card relative flex flex-col justify-between overflow-hidden rounded-2xl border border-dashed border-border bg-card/60 text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-500/40">
      <div className="flex flex-1 flex-col px-5 pt-5 pb-4">
        {/* Top Header: Icon avatar + Email + Dropdown Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative shrink-0">
              <Avatar className="h-11 w-11 ring-2 ring-border/60">
                <AvatarFallback
                  className={`${
                    isExpired
                      ? "bg-destructive/10 text-destructive"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  <Mail className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                  isExpired ? "bg-destructive" : "bg-blue-500"
                }`}
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <h3
                className="font-semibold text-base leading-snug text-foreground truncate tracking-tight group-hover/card:text-blue-500 transition-colors"
                title={invitation.email}
              >
                {invitation.email}
              </h3>
              <p
                className={`text-xs truncate mt-0.5 font-medium flex items-center gap-1 ${
                  isExpired ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                <Clock
                  className={`h-3 w-3 shrink-0 ${
                    isExpired ? "text-destructive/80" : "text-blue-500/80"
                  }`}
                />
                {isExpired
                  ? `Expired ${expiryRelative}`
                  : `Expires ${expiryRelative}`}
              </p>
            </div>
          </div>

          {!isReadOnly ? (
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
                  className="cursor-pointer font-medium"
                  onSelect={handleResend}
                  disabled={isResending}
                >
                  {isResending ? (
                    <Loader2 className="h-4 w-4 mr-2.5 animate-spin" />
                  ) : (
                    <RotateCw className="h-4 w-4 mr-2.5" />
                  )}
                  Resend Invitation
                </DropdownMenuItem>
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
          <div className="flex flex-wrap items-center gap-2">
            <FestivalRoleBadge festivalRole={invitation.festivalRole as any} />
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                isExpired
                  ? "text-destructive"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isExpired
                    ? "bg-destructive"
                    : "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                }`}
              />
              {isExpired ? "Expired" : "Pending"}
            </span>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-4 flex items-center gap-4 rounded-lg bg-muted/40 px-3 py-2.5 overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">
              <span className="text-muted-foreground">Invited: </span>
              <span className="font-medium text-foreground">
                {formatDate(createdAt, { tz: displayTz, style: "medium" })}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <span className="text-sm whitespace-nowrap">
              <span className="text-muted-foreground">
                {isExpired ? "Expired On: " : "Expires: "}
              </span>
              <span className="font-medium text-foreground">
                {formatDate(expiresAt, { tz: displayTz, style: "medium" })}
              </span>
            </span>
          </div>
        </div>

        {/* Expired: surface recovery as a primary inline action */}
        {isExpired && !isReadOnly ? (
          <Button
            type="button"
            size="sm"
            onClick={handleResend}
            disabled={isResending}
            className="mt-4 w-full rounded-xl font-medium"
          >
            {isResending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="mr-2 h-4 w-4" />
            )}
            Resend invitation
          </Button>
        ) : null}
      </div>
    </div>
  );
}
