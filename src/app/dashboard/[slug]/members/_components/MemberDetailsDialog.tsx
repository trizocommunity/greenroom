"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { StagePickerCards } from "@/components/festival/stage-assignment/StagePickerCards";
import { useDisplayTimezone } from "@/components/providers/user-timezone-provider";
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
import { formatDate, parseInstant } from "@/core/datetime";
import { cn } from "@/core/utils/cn";
import type { Member } from "./types";

interface MemberDetailsDialogProps {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages?: { id: string; name: string }[];
  assignedStageIds?: string[];
  canAssignStages?: boolean;
  onSaveStages?: (newStageIds: string[]) => void;
  isSaving?: boolean;
}

export function MemberDetailsDialog({
  member,
  open,
  onOpenChange,
  stages = [],
  assignedStageIds = [],
  canAssignStages = false,
  onSaveStages,
  isSaving = false,
}: MemberDetailsDialogProps) {
  const fullName = member.user?.fullName || member.fullName || "Unknown";
  const email = member.user?.email || member.email || "";
  const joinedAt = parseInstant(member.createdAt);
  const displayTz = useDisplayTimezone();
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

  const [selectedStages, setSelectedStages] =
    useState<string[]>(assignedStageIds);

  useEffect(() => {
    if (open) {
      setSelectedStages(assignedStageIds);
    }
  }, [open, assignedStageIds]);

  const toggleStage = (id: string) => {
    setSelectedStages((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const isAllAssigned =
    stages.length > 0 && selectedStages.length === stages.length;

  const toggleAllStages = () => {
    if (isAllAssigned) {
      setSelectedStages([]);
    } else {
      setSelectedStages(stages.map((s) => s.id));
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex flex-row items-start sm:items-center gap-3 border-b border-border/60 pb-4 pt-2">
          <Avatar className="h-12 w-12 shrink-0 border border-border shadow-sm">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
            <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <DrawerTitle className="truncate text-lg font-bold tracking-tight">
              {fullName}
            </DrawerTitle>
            <DrawerDescription className="truncate text-sm mt-0.5">
              {email}
            </DrawerDescription>
          </div>
        </DrawerHeader>

        <div className="space-y-4 py-4 overflow-y-auto max-h-[60vh] px-4 -mx-4">
          <div className="flex flex-wrap items-center gap-2">
            <FestivalRoleBadge festivalRole={member.role as any} />
            <Badge
              variant="outline"
              className={
                member.isActive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium"
              }
            >
              <span
                className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                  member.isActive ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {member.isActive ? "Active" : "Inactive"}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              Joined {formatDate(joinedAt, { tz: displayTz, style: "medium" })}
            </span>
          </div>

          {member.role === "STAGE_MANAGER" && stages && (
            <div className="space-y-2 mt-2">
              <div className="font-semibold text-sm">
                Stages{" "}
                {canAssignStages && <span className="text-destructive">*</span>}
              </div>
              {stages.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">
                  No stages created yet.
                </div>
              ) : !canAssignStages && assignedStageIds.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">
                  No stages assigned.
                </div>
              ) : canAssignStages ? (
                <StagePickerCards
                  stages={stages}
                  selectedIds={selectedStages}
                  onChange={setSelectedStages}
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {stages.map((stage) => {
                    const isAssigned = assignedStageIds.includes(stage.id);
                    if (!isAssigned) return null;

                    return (
                      <div
                        key={stage.id}
                        className="flex flex-col items-start gap-0.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-left"
                      >
                        <span className="truncate text-sm font-medium">
                          {stage.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {canAssignStages ? "Cancel" : "Close"}
          </Button>
          {canAssignStages && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onSaveStages?.(selectedStages)}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
