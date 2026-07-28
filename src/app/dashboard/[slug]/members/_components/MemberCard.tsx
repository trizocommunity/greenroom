"use client";

import { format } from "date-fns";
import {
  CalendarDays,
  Eye,
  Loader2,
  MoreVertical,
  Radio,
  ShieldCheck,
  Trash2,
} from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [isSaving, setIsSaving] = useState(false);

  const isStageManager = member.role === "STAGE_MANAGER";
  const canAssignStages =
    isStageManager && canManageStageAssignments && !isReadOnly;

  const { data: stages = [] } = useStages(festivalId);
  const { data: stageAssignments = [] } = useStageAssignments(festivalId);
  const assignManager = useAssignStageManager();
  const unassignManager = useUnassignStageManager();

  const handleSaveStages = async (newStageIds: string[]) => {
    setIsSaving(true);
    try {
      const currentAssignedIds = stageAssignments
        .filter((a) => a.memberId === member.id)
        .map((a) => a.stageId);

      const toAssign = newStageIds.filter(id => !currentAssignedIds.includes(id));
      const toUnassign = currentAssignedIds.filter(id => !newStageIds.includes(id));

      for (const stageId of toAssign) {
        await assignManager.mutateAsync({
          festivalId,
          data: { stageId, memberId: member.id },
        });
      }
      
      for (const stageId of toUnassign) {
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
      
      toast.success("Stage assignments updated");
      setShowDetails(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update stage assignments");
    } finally {
      setIsSaving(false);
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

  return (
    <div className="group/card relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
      <div className="flex flex-1 flex-col px-5 pt-5 pb-4">
        {/* Top Header: Avatar + Name/Email + Dropdown Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative shrink-0">
              <Avatar className="h-11 w-11 ring-2 ring-border/60">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
                <AvatarFallback className="bg-gradient-to-br from-primary/25 to-primary/10 text-sm font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                  member.isActive ? "bg-emerald-500" : "bg-amber-500"
                }`}
                title={member.isActive ? "Active" : "Inactive"}
              />
            </div>
            <div className="flex min-w-0 flex-col">
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
          <div className="flex flex-wrap items-center gap-2">
            <FestivalRoleBadge festivalRole={member.role as any} />
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                member.isActive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  member.isActive
                    ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                    : "bg-amber-500"
                }`}
              />
              {member.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* Meta row: joined + access */}
        <div className="mt-3 flex items-center gap-3.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {format(joinedAt, "MMM d, yyyy")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            {member.isActive ? "Full Access" : "Disabled"}
          </span>
        </div>

        {isStageManager ? (
          <div className="mt-3 flex flex-wrap items-center gap-1">
            <Radio className="h-3 w-3 text-primary/70 shrink-0" />
            {stageAssignments.filter((a) => a.memberId === member.id)
              .length === 0 ? (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Unassigned
              </span>
            ) : (
              stageAssignments
                .filter((a) => a.memberId === member.id)
                .map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                  >
                    {a.stage.name}
                  </span>
                ))
            )}
          </div>
        ) : null}
      </div>

      <MemberDetailsDialog
        member={member}
        open={showDetails}
        onOpenChange={setShowDetails}
        stages={stages}
        assignedStageIds={stageAssignments
          .filter((a) => a.memberId === member.id)
          .map((a) => a.stageId)}
        canAssignStages={canAssignStages}
        onSaveStages={handleSaveStages}
        isSaving={isSaving}
      />
    </div>
  );
}
