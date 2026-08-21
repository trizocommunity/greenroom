"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

export type ScheduleHeaderProps = {
  conflictCount: number;
  isReadOnly: boolean;
  hasStages: boolean;
  hasProgrammes: boolean;
  hasFestivalDates: boolean;
  canAdd: boolean;
  onAddClick: () => void;
  onClearClick: () => void;
};

export function ScheduleHeader({
  conflictCount,
  isReadOnly,
  hasStages,
  hasProgrammes,
  hasFestivalDates,
  canAdd,
  onAddClick,
  onClearClick,
}: ScheduleHeaderProps) {
  return (
    <div className="flex flex-row items-center justify-between gap-3">
      <h2 className="text-2xl font-bold tracking-tight">Schedule</h2>
      <div className="flex items-center gap-2 flex-wrap">
        {conflictCount > 0 && (
          <Badge variant="destructive" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {conflictCount} Conflict{conflictCount !== 1 ? "s" : ""}
          </Badge>
        )}
        {!isReadOnly && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={onClearClick}
              disabled={!canAdd}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Clear Schedule
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!hasStages) {
                  toast.error("Create at least one stage first.");
                  return;
                }
                if (!hasProgrammes) {
                  toast.error("Create programmes first.");
                  return;
                }
                if (!hasFestivalDates) {
                  toast.error("Set festival dates first.");
                  return;
                }
                onAddClick();
              }}
              disabled={!canAdd}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Schedule
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
