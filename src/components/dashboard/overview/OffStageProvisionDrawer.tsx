"use client";

import { CheckCircle2, ListTodo, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useProvisionOffStage } from "@/api/client/server-actions";
import { useStages } from "@/api/client/stages";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface OffStageProvisionDrawerProps {
  festivalId: string;
  festivalSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OffStageProvisionDrawer({
  festivalId,
  festivalSlug,
  open,
  onOpenChange,
}: OffStageProvisionDrawerProps) {
  const { data: stages, isLoading: isStagesLoading } = useStages(festivalId);
  const { mutate: provisionStage, isPending } = useProvisionOffStage();

  const offStage = stages?.find((s: any) => s.isOffStage);

  const handleProvision = () => {
    provisionStage({ festivalId });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            Off-Stage Provisions
          </SheetTitle>
          <SheetDescription>
            Configure background tasks, deadlines, and timelines for operations
            that happen off the main stage.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6">
          <div className="bg-muted p-4 rounded-md">
            <h4 className="text-sm font-semibold mb-2">Off-Stage Tasks</h4>
            <p className="text-sm text-muted-foreground">
              Off-stage events are configured as special stages in the schedule.
              Create an &quot;Off-Stage&quot; virtual stage to start tracking
              these tasks.
            </p>
          </div>

          <div className="border rounded-md p-4 space-y-4">
            <h4 className="text-sm font-semibold">Virtual Stage Status</h4>
            {isStagesLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : offStage ? (
              <div className="flex items-center gap-3 bg-primary/10 text-primary p-3 rounded-md">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <p className="font-medium text-sm">Provisioned</p>
                  <p className="text-xs opacity-90">{offStage.name}</p>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleProvision}
                disabled={isPending}
                className="w-full"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Provision Virtual Stage
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild>
              <Link
                href={`/dashboard/${festivalSlug}/pre-event-works/schedule`}
              >
                Go to Schedule
              </Link>
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
