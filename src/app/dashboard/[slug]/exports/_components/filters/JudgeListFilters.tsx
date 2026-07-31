"use client";

import { useCategories } from "@/api/client/categories";
import { useProgrammes } from "@/api/client/programmes";
import { useStages } from "@/api/client/stages";
import type { JudgeListConfig } from "@/features/exports/schemas/export-config.schema";
import {
  CheckList,
  PAGE_LAYOUT_OPTIONS,
  SegmentedControl,
  ToggleRow,
  toggleId,
} from "./controls";

interface Props {
  festivalId: string;
  value: JudgeListConfig;
  onChange: (value: JudgeListConfig) => void;
}

export function JudgeListFilters({ festivalId, value, onChange }: Props) {
  const { data: categories } = useCategories(festivalId);
  const { data: programmes } = useProgrammes(festivalId);
  const { data: stages } = useStages(festivalId);
  const set = (patch: Partial<JudgeListConfig>) =>
    onChange({ ...value, ...patch });

  const competitionWise = value.grouping === "PROGRAMME_WISE";

  return (
    <div className="space-y-5 rounded-lg border p-4">
      <SegmentedControl
        label="Export Grouping"
        value={value.grouping}
        onChange={(v) => set({ grouping: v })}
        options={[
          { value: "JUDGE_WISE", label: "Judge-wise" },
          { value: "PROGRAMME_WISE", label: "Programme-wise" },
        ]}
      />
      <SegmentedControl
        label="Layout Mode"
        value={value.layout}
        onChange={(v) => set({ layout: v })}
        options={PAGE_LAYOUT_OPTIONS}
      />
      <ToggleRow
        label="Include judge details"
        checked={value.includeDescription}
        onChange={(v) => set({ includeDescription: v })}
      />

      {competitionWise ? (
        <>
          <CheckList
            label="Categories"
            hint="Leave empty to include all"
            options={categories ?? []}
            selected={value.categoryIds}
            onToggle={(id, v) =>
              set({ categoryIds: toggleId(value.categoryIds, id, v) })
            }
          />
          <CheckList
            label="Programmes"
            hint="Leave empty to include all"
            options={programmes ?? []}
            selected={value.programmeIds}
            onToggle={(id, v) =>
              set({ programmeIds: toggleId(value.programmeIds, id, v) })
            }
          />
        </>
      ) : (
        <CheckList
          label="Stages"
          hint="Leave empty to include all stages"
          options={stages ?? []}
          selected={value.stageIds}
          onToggle={(id, v) =>
            set({ stageIds: toggleId(value.stageIds, id, v) })
          }
        />
      )}
    </div>
  );
}
