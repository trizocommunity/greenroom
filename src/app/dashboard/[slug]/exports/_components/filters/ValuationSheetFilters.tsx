"use client";

import { useCategories } from "@/api/client/categories";
import { useProgrammes } from "@/api/client/programmes";
import type { ValuationSheetConfig } from "@/features/exports/schemas/export-config.schema";
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
  value: ValuationSheetConfig;
  onChange: (value: ValuationSheetConfig) => void;
}

export function ValuationSheetFilters({ festivalId, value, onChange }: Props) {
  const { data: categories } = useCategories(festivalId);
  const { data: programmes } = useProgrammes(festivalId);
  const set = (patch: Partial<ValuationSheetConfig>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="space-y-5 rounded-lg border p-4">
      <SegmentedControl
        label="Gender filter"
        value={value.gender}
        onChange={(v) => set({ gender: v })}
        options={GENDER_OPTIONS}
      />
      <ToggleRow
        label="Include code letters"
        checked={value.includeCodeLetters}
        onChange={(v) => set({ includeCodeLetters: v })}
      />
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
