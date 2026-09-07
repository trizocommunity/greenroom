"use client";

import { useCategories } from "@/api/client/categories";
import { useExportTemplates } from "@/api/client/exports";
import { useGroups } from "@/api/client/groups";
import type { BadgeConfig } from "@/features/exports/schemas/export-config.schema";
import {
  CheckList,
  GENDER_OPTIONS,
  PAGE_ORIENTATION_OPTIONS,
  PAGE_SIZE_OPTIONS,
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

  // Exclude GENERAL categories — they aggregate many participants and would
  // produce extremely large exports. Badges are per-participant, so only
  // SINGLE (competition) categories are relevant.
  const singleCategories = (categories ?? []).filter(
    (c) => c.type === "SINGLE",
  );

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
      <SegmentedControl
        label="Page Size"
        value={value.pageSize}
        onChange={(v) => set({ pageSize: v })}
        options={PAGE_SIZE_OPTIONS}
      />
      <SegmentedControl
        label="Orientation"
        value={value.pageOrientation}
        onChange={(v) => set({ pageOrientation: v })}
        options={PAGE_ORIENTATION_OPTIONS}
      />
      <ToggleRow
        label="Only participants with chest numbers"
        checked={value.onlyWithChestNumber}
        onChange={(v) => set({ onlyWithChestNumber: v })}
      />
      <CheckList
        label="Categories"
        hint="Leave empty to include all"
        options={singleCategories}
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
