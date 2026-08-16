"use client";

import { Loader2, Megaphone } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
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
import { MapPin, Users, User, PlayCircle } from "lucide-react";

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
  const params = useParams();
  const slug = params?.slug as string;
  const [isPending, startTransition] = useTransition();

  if (!entry || entry.type !== "PROGRAMME" || !entry.programme) {
    return null;
  }

  const programme = entry.programme;
  const isGroup = programme.type === "GROUP";

  const handleStart = () => {
    onSuccess();
    onOpenChange(false);

    if (slug) {
      router.push(
        `/dashboard/${slug}/event-works/reporting?programmeId=${programme.id}`,
      );
    }

    (async () => {
      try {
        const res = await startProgrammeReportingAction(
          festivalId,
          programme.id,
        );
        if (res.success) {
          await notifyCallList(festivalId, entry.id).catch(() => {});
          toast.success("Reporting started and Announcer notified!");
        } else {
          toast.error("Failed to start reporting");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to start reporting",
        );
      }
    })();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="text-xl font-bold">
            Start Reporting
          </DrawerTitle>
          <DrawerDescription>
            You are about to open the reporting desk for this programme.
          </DrawerDescription>
        </DrawerHeader>
        <div className="py-4 space-y-4">
          <div className="bg-muted/40 rounded-xl p-4 border space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                <PlayCircle className="w-4 h-4" />
                Programme
              </h3>
              <p className="font-medium text-foreground text-lg leading-tight">
                {programme.name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                  {isGroup ? (
                    <Users className="w-3.5 h-3.5" />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                  Type
                </h3>
                <p className="font-medium text-sm">
                  {isGroup ? "Group" : "Individual"}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Stage
                </h3>
                <p className="font-medium text-sm">
                  {entry.stage?.name ?? "No stage assigned"}
                </p>
              </div>
              <div className="col-span-2">
                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5" />
                  Assigned Participants
                </h3>
                <p className="font-medium text-sm">
                  {isGroup
                    ? `${entry.teamCount} Teams (Team Lead & Party)`
                    : `${entry.assignmentCount} Individuals`}
                </p>
              </div>
            </div>
          </div>
        </div>
        <DrawerFooter className="pt-0">
          <Button className="w-full" onClick={handleStart} disabled={isPending}>
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
      </DrawerContent>
    </Drawer>
  );
}
