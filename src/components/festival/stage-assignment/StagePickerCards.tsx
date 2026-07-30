"use client";

import { Check } from "lucide-react";
import { cn } from "@/core/utils/cn";

export interface StagePickerOption {
  id: string;
  name: string;
  description?: string | null;
}

interface StagePickerCardsProps {
  stages: StagePickerOption[];
  selectedIds: string[];
  onChange: (nextSelectedIds: string[]) => void;
  emptyMessage?: string;
}

export function StagePickerCards({
  stages,
  selectedIds,
  onChange,
  emptyMessage = "No stages have been created for this festival yet.",
}: StagePickerCardsProps) {
  if (stages.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const allSelected = stages.every((stage) => selectedIds.includes(stage.id));

  const toggleStage = (stageId: string) => {
    onChange(
      selectedIds.includes(stageId)
        ? selectedIds.filter((id) => id !== stageId)
        : [...selectedIds, stageId],
    );
  };

  const toggleAll = () => {
    onChange(allSelected ? [] : stages.map((stage) => stage.id));
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggleAll}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
          allSelected
            ? "border-primary bg-primary/10 text-primary"
            : "border-border/60 hover:border-primary/40",
        )}
      >
        All stages
        {allSelected && <Check className="h-4 w-4 shrink-0" />}
      </button>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stages.map((stage) => {
          const isSelected = selectedIds.includes(stage.id);
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => toggleStage(stage.id)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border/60 hover:border-primary/40",
              )}
            >
              <div className="flex w-full items-center justify-between gap-1">
                <span className="truncate text-sm font-medium">
                  {stage.name}
                </span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
              </div>
              {stage.description && (
                <span className="truncate text-xs text-muted-foreground w-full">
                  {stage.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
