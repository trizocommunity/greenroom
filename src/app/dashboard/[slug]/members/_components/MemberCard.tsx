"use client";

import { format } from "date-fns";
import { Eye, Loader2, MoreVertical, Radio, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRemoveMember } from "@/api/client/members";
import {
  useAssignStageManager,
  useStageAssignments,
  useUnassignStageManager,
} from "@/api/client/stage-assignments";
import { useStages } from "@/api/client/stages";
import { FestivalRoleBadge } from "@/components/festival/FestivalRoleBadge";
import { StageAssignmentToggleDialog } from "@/components/festival/stage-assignment/StageAssignmentToggleDialog";
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
  canManageStageAssignments?: boolean;
}

export function MemberCard({
  member,
  festivalId,
  isOwner,
  isReadOnly,
  canManageStageAssignments = false,
}: MemberCardProps) {
  const removeMember = useRemoveMember();
  const [isRevoking, setIsRevoking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showAssignStages, setShowAssignStages] = useState(false);
  const [pendingStageId, setPendingStageId] = useState<string | null>(null);

  const isStageManager = member.role === "STAGE_MANAGER";
  const canAssignStages =
    isStageManager && canManageStageAssignments && !isReadOnly;

  const { data: stages = [] } = useStages(festivalId);
  const { data: stageAssignments = [] } = useStageAssignments(festivalId);
  const assignManager = useAssignStageManager();
  const unassignManager = useUnassignStageManager();

  const handleToggleStage = async (stageId: string, nextAssigned: boolean) => {
    setPendingStageId(stageId);
    try {
      if (nextAssigned) {
        await assignManager.mutateAsync({
          festivalId,
          data: { stageId, memberId: member.id },
        });
      } else {
        const existing = stageAssignments.find(
          (a) => a.stageId === stageId && a.memberId === member.id,
        );
        if (existing) {
          await unassignManager.mutateAsync({
            festivalId,
            assignmentId: existing.id,
          });
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update stage assignment");
    } finally {
      setPendingStageId(null);
    }
  };

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
      {/* Accent bar removed per user request */}

      <div className="flex flex-1 flex-col pl-5 pr-4 pt-5 pb-4">
        {/* Top Header: Name/Email + Dropdown Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col min-w-0 flex-1 pt-0.5">
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
              {canAssignStages ? (
                <DropdownMenuItem
                  onSelect={() => setShowAssignStages(true)}
                  className="cursor-pointer font-medium"
                >
                  <Radio className="h-4 w-4 mr-2.5 text-muted-foreground" />
                  Assign Stages
                </DropdownMenuItem>
              ) : null}
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

        {/* Stats strip */}
        <div className="mt-4 flex items-center gap-4 rounded-lg bg-muted/40 px-3 py-2.5 overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">
              <span className="text-muted-foreground">Joined: </span>
              <span className="font-medium text-foreground">
                {format(joinedAt, "MMM d, yyyy")}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <span className="text-sm whitespace-nowrap">
              <span className="text-muted-foreground">Access: </span>
              <span className="font-medium text-foreground">
                {member.isActive ? "Full Access" : "Disabled"}
              </span>
            </span>
          </div>
        </div>

        {isStageManager ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">
              Stages:
            </span>
            {stageAssignments.filter((a) => a.memberId === member.id)
              .length === 0 ? (
              <Badge variant="outline" className="text-xs font-normal">
                Unassigned
              </Badge>
            ) : (
              stageAssignments
                .filter((a) => a.memberId === member.id)
                .map((a) => (
                  <Badge
                    key={a.id}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {a.stage.name}
                  </Badge>
                ))
            )}
          </div>
        ) : null}
      </div>

      <MemberDetailsDialog
        member={member}
        open={showDetails}
        onOpenChange={setShowDetails}
      />

      {canAssignStages && (
        <StageAssignmentToggleDialog
          open={showAssignStages}
          onOpenChange={setShowAssignStages}
          title={`Stages for ${fullName}`}
          description="Only assigned stages will appear in this Stage Manager's dashboard, schedule, sessions, and reporting."
          emptyMessage="No stages created yet. Add one from Stage Management first."
          options={stages.map((s) => ({ id: s.id, label: s.name }))}
          assignedIds={stageAssignments
            .filter((a) => a.memberId === member.id)
            .map((a) => a.stageId)}
          pendingId={pendingStageId}
          onToggle={handleToggleStage}
        />
      )}
    </div>
  );
}
