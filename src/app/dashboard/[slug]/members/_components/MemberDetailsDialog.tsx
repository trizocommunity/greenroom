"use client";

import { format } from "date-fns";
import { CheckCircle2, Loader2 } from "lucide-react";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { parseStoredInstant } from "@/core/utils/date-time";
import { cn } from "@/core/utils/cn";
import type { Member } from "./types";

interface MemberDetailsDialogProps {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages?: { id: string; name: string }[];
  assignedStageIds?: string[];
  canAssignStages?: boolean;
  onToggleStage?: (stageId: string, nextAssigned: boolean) => void;
  pendingStageId?: string | null;
}

export function MemberDetailsDialog({
  member,
  open,
  onOpenChange,
  stages = [],
  assignedStageIds = [],
  canAssignStages = false,
  onToggleStage,
  pendingStageId,
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex flex-row items-center gap-4 border-b border-border/60 pb-5 pt-1">
          <Avatar className="h-16 w-16 shrink-0 border-2 border-background shadow-md ring-2 ring-primary/20 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
            <AvatarFallback className="bg-transparent text-lg font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <DrawerTitle className="truncate text-xl font-bold tracking-tight text-foreground">
              {fullName}
            </DrawerTitle>
            <DrawerDescription className="truncate text-sm text-muted-foreground mt-0.5">
              {email}
            </DrawerDescription>
          </div>
        </DrawerHeader>

        <div className="space-y-5 py-3 overflow-y-auto max-h-[60vh] px-4 -mx-4">
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

          {member.role === "STAGE_MANAGER" && stages && (
            <div className="space-y-2.5 mt-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                {canAssignStages ? "Assign Stages" : "Assigned Stages"}
              </span>
              {stages.length === 0 ? (
                <div className="text-sm text-muted-foreground italic px-1">
                  No stages created yet.
                </div>
              ) : !canAssignStages && assignedStageIds.length === 0 ? (
                <div className="text-sm text-muted-foreground italic px-1">
                  No stages assigned.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {stages.map((stage) => {
                    const isAssigned = assignedStageIds.includes(stage.id);
                    const isPending = pendingStageId === stage.id;
                    
                    if (!canAssignStages && !isAssigned) return null;

                    return (
                      <div 
                        key={stage.id} 
                        onClick={() => {
                          if (canAssignStages && onToggleStage) {
                            onToggleStage(stage.id, !isAssigned);
                          }
                        }}
                        className={cn(
                          "relative flex flex-col p-3 rounded-xl border transition-all",
                          canAssignStages ? "cursor-pointer hover:border-primary/40 hover:bg-muted/50" : "",
                          isAssigned 
                            ? "border-primary bg-primary/5 text-primary shadow-sm" 
                            : "border-border/60 bg-card text-muted-foreground hover:bg-muted/30",
                          isPending ? "opacity-50 pointer-events-none" : ""
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">{stage.name}</span>
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          ) : isAssigned ? (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
      </DrawerContent>
    </Drawer>
  );
}
