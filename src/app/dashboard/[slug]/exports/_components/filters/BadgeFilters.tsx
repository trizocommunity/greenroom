"use client";

import { useCategories } from "@/api/client/categories";
import { useExportTemplates } from "@/api/client/exports";
import { useGroups } from "@/api/client/groups";
import type { BadgeConfig } from "@/features/exports/schemas/export-config.schema";
import {
  CheckList,
  GENDER_OPTIONS,
  PRINT_LAYOUT_OPTIONS,
  QUALITY_OPTIONS,
  SegmentedControl,
  TemplatePicker,
  ToggleRow,
  toggleId,
} from "./controls";

interface Props {
  festivalId: string;
  value: BadgeConfig;
  onChange: (value: BadgeConfig) => void;
}

export function BadgeFilters({ festivalId, value, onChange }: Props) {
  const { data: templates } = useExportTemplates(festivalId, "BADGE");
  const { data: categories } = useCategories(festivalId);
  const { data: teams } = useGroups(festivalId);
  const set = (patch: Partial<BadgeConfig>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5 rounded-lg border p-4">
      <TemplatePicker
        label="Template"
        options={templates ?? []}
        selectedId={value.templateId}
        onSelect={(id) => set({ templateId: id })}
      />
      <SegmentedControl
        label="Gender filter"
        value={value.gender}
        onChange={(v) => set({ gender: v })}
        options={GENDER_OPTIONS}
      />
      <SegmentedControl
        label="Export Quality"
        value={value.quality}
        onChange={(v) => set({ quality: v })}
        options={QUALITY_OPTIONS}
      />
      <SegmentedControl
        label="Print Layout"
        value={value.printLayout}
        onChange={(v) => set({ printLayout: v })}
        options={PRINT_LAYOUT_OPTIONS}
      />
      <ToggleRow
        label="Only participants with chest numbers"
        checked={value.onlyWithChestNumber}
        onChange={(v) => set({ onlyWithChestNumber: v })}
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
        label="Teams"
        hint="Leave empty to include all teams."
        options={teams ?? []}
        selected={value.teamIds}
        onToggle={(id, v) => set({ teamIds: toggleId(value.teamIds, id, v) })}
      />
    </div>
  );
}
