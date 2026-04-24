"use client";

import { Edit, Megaphone, Plus, Trash2 } from "lucide-react";

interface Stage {
  id: string;
  name: string;
  description: string | null;
  createdBy: string | null;
}
import { useState } from "react";
import { toast } from "sonner";
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
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFestivalReadOnly } from "@/hooks/useFestivalReadOnly";
import { deleteStage } from "@/server/actions/stage.actions";
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
  const [isDeleting, setIsDeleting] = useState(false);

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
      setIsDeleting(true);
      await deleteStage(stageToDelete);
      toast.success("Stage deleted successfully");
      setStageToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete stage");
    } finally {
      setIsDeleting(false);
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stages.map((stage) => (
            <Card key={stage.id} className="relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 pl-8">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                  onClick={() => handleEdit(stage)}
                  disabled={isReadOnly}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setStageToDelete(stage.id)}
                  disabled={isReadOnly}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <Megaphone className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{stage.name}</CardTitle>
                </div>

                <CardDescription className="line-clamp-2 min-h-[2.5em]">
                  {stage.description || "No description provided."}
                </CardDescription>

                <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground mt-2 border-t">
                  <span>Created by:</span>
                  <span className="font-medium text-foreground">
                    {stage.createdBy || "System"}
                  </span>
                </div>
              </CardHeader>
            </Card>
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
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
