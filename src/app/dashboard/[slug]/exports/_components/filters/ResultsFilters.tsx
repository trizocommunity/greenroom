"use client";

import { useCategories } from "@/api/client/categories";
import { useProgrammes } from "@/api/client/programmes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ResultsConfig } from "@/features/exports/schemas/export-config.schema";
import {
  CheckList,
  GENDER_OPTIONS,
  PAGE_LAYOUT_OPTIONS,
  SegmentedControl,
  ToggleRow,
  toggleId,
} from "./controls";

interface Props {
  festivalId: string;
  value: ResultsConfig;
  onChange: (value: ResultsConfig) => void;
}

export function ResultsFilters({ festivalId, value, onChange }: Props) {
  const { data: categories } = useCategories(festivalId);
  const { data: programmes } = useProgrammes(festivalId);
  const set = (patch: Partial<ResultsConfig>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="space-y-5 rounded-lg border p-4">
      <SegmentedControl
        label="Result Type"
        value={value.listType}
        onChange={(v) => set({ listType: v })}
        options={[
          { value: "PROGRAMME_WISE", label: "Programme-wise" },
          { value: "TEAM_WISE", label: "Team-wise" },
        ]}
      />
      <SegmentedControl
        label="Gender filter"
        value={value.gender}
        onChange={(v) => set({ gender: v })}
        options={GENDER_OPTIONS}
      />

      <div className="space-y-2.5">
        <ToggleRow
          label="Only published results"
          checked={value.onlyPublished}
          onChange={(v) => set({ onlyPublished: v })}
        />
        <ToggleRow
          label="Include grades"
          checked={value.includeGrades}
          onChange={(v) => set({ includeGrades: v })}
        />
        <ToggleRow
          label="Include points"
          checked={value.includePoints}
          onChange={(v) => set({ includePoints: v })}
        />
        <ToggleRow
          label="Include code letter"
          checked={value.includeCodeLetter}
          onChange={(v) => set({ includeCodeLetter: v })}
        />
        <ToggleRow
          label="Include judges' reports"
          checked={value.includeJudgeReports}
          onChange={(v) => set({ includeJudgeReports: v })}
        />
        <ToggleRow
          label="Include phone number"
          checked={value.includePhone}
          onChange={(v) => set({ includePhone: v })}
        />
        <ToggleRow
          label="Include date of birth"
          checked={value.includeDob}
          onChange={(v) => set({ includeDob: v })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="start-result">Start result number</Label>
          <Input
            id="start-result"
            type="number"
            min={1}
            value={value.startResultNumber}
            onChange={(e) =>
              set({
                startResultNumber: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-result">End result number</Label>
          <Input
            id="end-result"
            type="number"
            min={1}
            placeholder="All"
            value={value.endResultNumber ?? ""}
            onChange={(e) =>
              set({
                endResultNumber: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
      </div>

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

      <SegmentedControl
        label="Page layout"
        value={value.pageLayout}
        onChange={(v) => set({ pageLayout: v })}
        options={PAGE_LAYOUT_OPTIONS}
      />
    </div>
  );
}
