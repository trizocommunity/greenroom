"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { completeProgrammeReportingAction } from "@/features/programmes/actions/programme-reporting.actions";
import { toast } from "@/lib/toast";
import type { ReportingBoardItem } from "./types";
import { parseInstant } from "@/core/datetime";
import { cn } from "@/core/utils/cn";

interface LargeTimerDrawerProps {
  festivalId: string;
  item: ReportingBoardItem | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LargeTimerDrawer({
  festivalId,
  item,
  isOpen,
  onOpenChange,
}: LargeTimerDrawerProps) {
  const queryClient = useQueryClient();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const timerStart = item?.reportingSession?.endedAt
    ? typeof item.reportingSession.endedAt === "string"
      ? parseInstant(item.reportingSession.endedAt)
      : item.reportingSession.endedAt
    : null;

  const durationMinutes = item
    ? item.programme.durationMode === "PARALLEL"
      ? (item.programme.parallelDurationMinutes ??
        item.programme.timePerUnitMinutes)
      : item.programme.timePerUnitMinutes
    : 0;

  useEffect(() => {
    if (!isOpen || !timerStart || !durationMinutes) return;

    const end = timerStart.getTime() + durationMinutes * 60 * 1000;
    const update = () => {
      setTimeLeft(Math.max(0, end - Date.now()));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [isOpen, timerStart, durationMinutes]);

  const isOver = timeLeft <= 0 && isOpen && timerStart;

  const m = Math.floor(timeLeft / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);
  const formatted = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  const handleComplete = async () => {
    if (!item?.reportingSession) return;
    setIsCompleting(true);
    try {
      const res = await completeProgrammeReportingAction(
        festivalId,
        item.reportingSession.id,
      );
      if (res.success) {
        toast.success("Programme dismissed successfully");
        onOpenChange(false);
        queryClient.invalidateQueries({
          queryKey: ["programme-reporting-board", festivalId],
        });
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to dismiss programme");
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-8">
        <DrawerHeader className="text-center">
          <DrawerTitle className="text-xl">{item?.programme.name}</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col items-center justify-center p-8">
          <div
            className={cn(
              "font-mono font-bold tracking-tighter transition-colors",
              isOver ? "text-red-500 animate-pulse" : "text-foreground",
            )}
            style={{ fontSize: "6rem", lineHeight: "1" }}
          >
            {isOver ? "00:00" : formatted}
          </div>

          {isOver && (
            <div className="mt-12 animate-in fade-in slide-in-from-bottom-4">
              <Button
                size="lg"
                variant="destructive"
                onClick={handleComplete}
                disabled={isCompleting}
                className="w-full sm:w-auto min-w-48"
              >
                {isCompleting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                Dismiss Programme
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
