"use client";

import { format } from "date-fns";
import { parseStoredInstant } from "@/core/utils/date-time";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Member } from "./types";

interface MemberDetailsDialogProps {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberDetailsDialog({
  member,
  open,
  onOpenChange,
}: MemberDetailsDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden border border-border/80 bg-card shadow-xl rounded-2xl">
        <DialogHeader className="flex flex-row items-center gap-4 border-b border-border/60 pb-5 pt-1">
          <Avatar className="h-16 w-16 shrink-0 border-2 border-background shadow-md ring-2 ring-primary/20 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
            <AvatarFallback className="bg-transparent text-lg font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <DialogTitle className="truncate text-xl font-bold tracking-tight text-foreground">
              {fullName}
            </DialogTitle>
            <DialogDescription className="truncate text-sm text-muted-foreground mt-0.5">
              {email}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/40 bg-muted/30 p-3.5 space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned Role
              </span>
              <div>
                <FestivalRoleBadge festivalRole={member.role as any} />
              </div>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/30 p-3.5 space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Access Status
              </span>
              <div>
                <Badge
                  variant="outline"
                  className={
                    member.isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium"
                  }
                >
                  <span
                    className={`mr-1.5 h-2 w-2 rounded-full ${
                      member.isActive
                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
                        : "bg-amber-500"
                    }`}
                  />
                  {member.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-muted/20 p-3.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Joined On
            </span>
            <span className="text-sm font-semibold text-foreground">
              {format(joinedAt, "MMMM d, yyyy")}
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border/40">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-medium px-5"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
