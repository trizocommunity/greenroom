"use client";

import {
  Edit,
  KeyRound,
  Megaphone,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface Stage {
  id: string;
  name: string;
  description: string | null;
  createdBy: string | null;
}

import { useState } from "react";
import { toast } from "sonner";
import { useMembers } from "@/api/client/members";
import {
  useAssignStageManager,
  useStageAssignments,
  useUnassignStageManager,
} from "@/api/client/stage-assignments";
import { useDeleteStage } from "@/api/client/stages";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
import { StageAssignmentToggleDialog } from "@/components/festival/stage-assignment/StageAssignmentToggleDialog";
import { StagePortalCredentialDialog } from "@/components/festival/stage-assignment/StagePortalCredentialDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFestivalReadOnly } from "@/features/festivals/hooks/use-festival-read-only";
import { StageDialog } from "./StageDialog";

interface StagesClientProps {
  festivalId: string;
  stages: Stage[];
  /** Only Owner/Admin/Super Admin may create, edit, or delete stage records. */
  canManageStages: boolean;
}

export function StagesClient({
  festivalId,
  stages,
  canManageStages,
}: StagesClientProps) {
  const { isReadOnly: isSubscriptionReadOnly } = useFestivalReadOnly();
  const isReadOnly = isSubscriptionReadOnly || !canManageStages;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<Stage | undefined>(
    undefined,
  );
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);
  const deleteStage = useDeleteStage();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredStages = stages.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.description?.toLowerCase().includes(q) ?? false)
    );
  });

  const [managingStageId, setManagingStageId] = useState<string | null>(null);
  const [portalAccessStageId, setPortalAccessStageId] = useState<string | null>(
    null,
  );
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const { data: members = [] } = useMembers(festivalId);
  const { data: stageAssignments = [] } = useStageAssignments(festivalId);
  const assignManager = useAssignStageManager();
  const unassignManager = useUnassignStageManager();

  const stageManagers = members.filter(
    (m) => m.role === "STAGE_MANAGER" && m.isActive,
  );

  const managersForStage = (stageId: string) =>
    stageAssignments
      .filter((a) => a.stageId === stageId)
      .map(
        (a) =>
          a.member.user.displayName ||
          a.member.user.fullName ||
          a.member.user.email,
      );

  const handleToggleManager = async (
    stageId: string,
    memberId: string,
    nextAssigned: boolean,
  ) => {
    setPendingMemberId(memberId);
    try {
      if (nextAssigned) {
        await assignManager.mutateAsync({
          festivalId,
          data: { stageId, memberId },
        });
      } else {
        const existing = stageAssignments.find(
          (a) => a.stageId === stageId && a.memberId === memberId,
        );
        if (existing) {
          await unassignManager.mutateAsync({
            festivalId,
            assignmentId: existing.id,
          });
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update stage manager");
    } finally {
      setPendingMemberId(null);
    }
  };

  const handleCreate = () => {
    if (isReadOnly) return;
    setSelectedStage(undefined);
    setIsDialogOpen(true);
  };

  const handleEdit = (stage: Stage) => {
    if (isReadOnly) return;
    setSelectedStage(stage);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!stageToDelete) return;
    if (isReadOnly) return;
    try {
      await deleteStage.mutateAsync({ festivalId, stageId: stageToDelete });
      toast.success("Stage deleted successfully");
      setStageToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete stage");
    }
  };

  return (
    <div className="">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between sm:gap-4 py-8">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Stage Management
        </h2>
        <div className="flex flex-row items-center gap-2 w-full md:w-auto">
          <HowItWorksButton
            title="How Stage Management works"
            description="Stages are venues or slots where programmes and sessions run."
          >
            <p className="text-sm text-muted-foreground">
              Create stages (e.g. Main Stage, Room A) and set the type to
              <strong> Stage</strong> or <strong>Non-Stage</strong>. Programmes
              and sessions are then assigned to a stage when you build the
              Schedule and Sessions.
            </p>
            <p className="text-sm text-muted-foreground">
              You can reorder stages and edit or delete them. Create at least
              one stage before adding entries to the schedule.
            </p>
          </HowItWorksButton>
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search stages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-full min-w-0"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            onClick={handleCreate}
            size="sm"
            className="gap-2 shrink-0 h-9 px-2 sm:px-3"
            disabled={isReadOnly}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Stage</span>
          </Button>
        </div>
      </div>

      {stages.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/20">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <Megaphone className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">No Stages Created</h3>
          <p className="text-muted-foreground text-center max-w-sm mt-1 mb-4">
            Get started by creating your first stage. Stages are where your
            programmes will be conducted.
          </p>
          <Button onClick={handleCreate} disabled={isReadOnly}>
            Create Stage
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredStages.length === 0 && stages.length > 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/20">
              <h3 className="text-lg font-semibold">No Stages Found</h3>
              <p className="text-muted-foreground text-center max-w-sm mt-1 mb-4">
                No stages found matching your search.
              </p>
            </div>
          )}
          {filteredStages.map((stage) => (
            <div
              key={stage.id}
              className="group/card relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20"
            >
              <div className="flex flex-1 flex-col p-4 sm:p-5">
                {/* Top: name + actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-primary/10 rounded-md shrink-0">
                      <Megaphone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="font-semibold text-base leading-tight text-foreground line-clamp-2"
                        title={stage.name}
                      >
                        {stage.name}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                        {stage.description || "No description provided."}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {!isReadOnly && (
                        <>
                          <DropdownMenuItem onSelect={() => handleEdit(stage)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setManagingStageId(stage.id)}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Manage managers
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setPortalAccessStageId(stage.id)}
                          >
                            <KeyRound className="h-4 w-4 mr-2" />
                            Portal access
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setStageToDelete(stage.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Spacer so footer stays at bottom */}
                <div className="flex-1 min-h-2" />

                {/* Stats strip */}
                <div className="mt-4 flex items-center gap-4 rounded-lg bg-muted/40 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Created by:</span>
                    <span className="font-medium text-foreground">
                      {stage.createdBy || "System"}
                    </span>
                  </div>
                </div>

                {/* Assigned managers */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">
                    Managers:
                  </span>
                  {managersForStage(stage.id).length === 0 ? (
                    <Badge variant="outline" className="text-xs font-normal">
                      Unassigned
                    </Badge>
                  ) : (
                    managersForStage(stage.id).map((name, i) => (
                      <Badge
                        key={`${stage.id}-manager-${i}`}
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isReadOnly && (
        <StageDialog
          festivalId={festivalId}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          stageToEdit={selectedStage}
          onSuccess={() => {
            // Revalidation handled by server action
          }}
        />
      )}

      {!isReadOnly && (
        <AlertDialog
          open={!!stageToDelete}
          onOpenChange={(open) => !open && setStageToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this stage?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                stage.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDelete}
                disabled={deleteStage.isPending}
              >
                {deleteStage.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {!isReadOnly && managingStageId && (
        <StageAssignmentToggleDialog
          open={!!managingStageId}
          onOpenChange={(open) => !open && setManagingStageId(null)}
          title={`Managers for ${
            stages.find((s) => s.id === managingStageId)?.name ?? "stage"
          }`}
          description="Only assigned Stage Managers can operate this stage's schedule, sessions, and reporting."
          emptyMessage="No Stage Manager members yet. Add one from the Members page first."
          options={stageManagers.map((m) => ({
            id: m.id,
            label: m.fullName,
            sublabel: m.email,
          }))}
          assignedIds={stageAssignments
            .filter((a) => a.stageId === managingStageId)
            .map((a) => a.memberId)}
          pendingId={pendingMemberId}
          onToggle={(memberId, nextAssigned) =>
            handleToggleManager(managingStageId, memberId, nextAssigned)
          }
        />
      )}

      <StagePortalCredentialDialog
        festivalId={festivalId}
        stageId={portalAccessStageId}
        stageName={
          stages.find((s) => s.id === portalAccessStageId)?.name ?? "stage"
        }
        open={!!portalAccessStageId}
        onOpenChange={(open) => {
          if (!open) setPortalAccessStageId(null);
        }}
        isReadOnly={isReadOnly}
      />
    </div>
  );
}
