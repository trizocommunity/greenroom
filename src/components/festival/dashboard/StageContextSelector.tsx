"use client";

import { Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALL_STAGES_VALUE,
  stageFilterCookieName,
} from "@/features/stages/stage-filter-constants";

interface StageContextSelectorProps {
  festivalId: string;
  stages: Array<{ id: string; name: string }>;
  currentStageId: string | null;
}

export function StageContextSelector({
  festivalId,
  stages,
  currentStageId,
}: StageContextSelectorProps) {
  const router = useRouter();

  const handleChange = (value: string) => {
    const cookieName = stageFilterCookieName(festivalId);
    if (value === ALL_STAGES_VALUE) {
      document.cookie = `${cookieName}=; path=/; max-age=0`;
    } else {
      document.cookie = `${cookieName}=${value}; path=/; max-age=${60 * 60 * 24 * 30}`;
    }
    router.refresh();
  };

  return (
    <Select
      value={currentStageId ?? ALL_STAGES_VALUE}
      onValueChange={handleChange}
    >
      <SelectTrigger className="h-8 w-[160px] text-xs sm:text-sm">
        <Radio className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="All stages" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_STAGES_VALUE}>All my stages</SelectItem>
        {stages.map((stage) => (
          <SelectItem key={stage.id} value={stage.id}>
            {stage.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
