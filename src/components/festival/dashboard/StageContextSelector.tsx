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
      // biome-ignore lint/suspicious/noDocumentCookie: stage filter is read by server components on navigation
      document.cookie = `${cookieName}=; path=/; max-age=0`;
    } else {
      // biome-ignore lint/suspicious/noDocumentCookie: stage filter is read by server components on navigation
      document.cookie = `${cookieName}=${value}; path=/; max-age=${60 * 60 * 24 * 30}`;
    }
    router.refresh();
  };

  return (
    <Select
      value={currentStageId ?? ALL_STAGES_VALUE}
      onValueChange={handleChange}
    >
      <SelectTrigger className="h-8 w-8 sm:w-auto sm:min-w-[140px] px-0 sm:px-3 justify-center sm:justify-between text-xs sm:text-sm [&>svg:last-child]:hidden sm:[&>svg:last-child]:block">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 sm:h-3.5 sm:w-3.5 shrink-0 text-foreground sm:text-muted-foreground" />
          <span className="hidden sm:inline-flex">
            <SelectValue placeholder="All stages" />
          </span>
        </div>
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
