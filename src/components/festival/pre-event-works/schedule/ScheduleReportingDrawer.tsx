"use client";

import { Loader2, Megaphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { startProgrammeReportingAction } from "@/features/programmes/actions/programme-reporting.actions";
import { notifyCallList } from "@/features/schedule/actions/schedule.actions";
import type { EnrichedScheduleEntry } from "@/features/schedule/actions/schedule.actions";
import { toast } from "@/lib/toast";

interface ScheduleReportingDrawerProps {
  festivalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: EnrichedScheduleEntry | null;
  onSuccess: () => void;
}

export function ScheduleReportingDrawer({
  festivalId,
  open,
  onOpenChange,
  entry,
  onSuccess,
}: ScheduleReportingDrawerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!entry || entry.type !== "PROGRAMME" || !entry.programme) {
    return null;
  }

  const programme = entry.programme;
  const isGroup = programme.type === "GROUP";

  const handleStart = () => {
    startTransition(async () => {
      try {
        const res = await startProgrammeReportingAction(festivalId, programme.id);
        if (res.success) {
          // Additionally, automatically notify the announcer
          await notifyCallList(festivalId, entry.id);
          toast.success("Reporting started and Announcer notified!");
          onSuccess();
          onOpenChange(false);
        } else {
          toast.error("Failed to start reporting");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to start reporting"
        );
      }
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Start Reporting</DrawerTitle>
            <DrawerDescription>
              Begin reporting for {programme.name}.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0 space-y-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">Programme</div>
              <div className="text-sm text-muted-foreground">{programme.name}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Type</div>
              <div className="text-sm text-muted-foreground">
                {isGroup ? "Group" : "Individual"}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Stage</div>
              <div className="text-sm text-muted-foreground">
                {entry.stage?.name ?? "No stage assigned"}
              </div>
            </div>
          </div>
          <DrawerFooter>
            <Button
              className="w-full"
              onClick={handleStart}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Megaphone className="mr-2 h-4 w-4" />
                  Start & Notify Announcer
                </>
              )}
            </Button>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
