"use client";

import { Edit, Megaphone, MoreVertical, Plus, Trash2 } from "lucide-react";

interface Stage {
  id: string;
  name: string;
  description: string | null;
  createdBy: string | null;
}

import { useState } from "react";
import { toast } from "sonner";
import { useDeleteStage } from "@/api/client/stages";
import { HowItWorksButton } from "@/components/dashboard/HowItWorksButton";
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
}

export function StagesClient({ festivalId, stages }: StagesClientProps) {
  const { isReadOnly } = useFestivalReadOnly();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<Stage | undefined>(
    undefined,
  );
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);
  const deleteStage = useDeleteStage();

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Stage Management</h2>
        <div className="flex items-center gap-2">
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
          <Button
            onClick={handleCreate}
            size="sm"
            className="gap-2"
            disabled={isReadOnly}
          >
            <Plus className="h-4 w-4" />
            Create Stage
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
          {stages.map((stage) => (
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
                    <DropdownMenuContent align="end" className="w-44">
                      {!isReadOnly && (
                        <>
                          <DropdownMenuItem onSelect={() => handleEdit(stage)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
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
    </div>
  );
}
