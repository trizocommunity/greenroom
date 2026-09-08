"use client";

import { useCategories } from "@/api/client/categories";
import { useExportTemplates } from "@/api/client/exports";
import { useGroups } from "@/api/client/groups";
import type { BadgeConfig } from "@/features/exports/schemas/export-config.schema";
import {
  BADGE_PAGE_SIZE_OPTIONS,
  FIT_OPTIONS,
  FieldGrid,
  GENDER_OPTIONS,
  GridPicker,
  LANDSCAPE_GRID_OPTIONS,
  NumberInput,
  PAGE_ORIENTATION_OPTIONS,
  PORTRAIT_GRID_OPTIONS,
  PRINT_LAYOUT_OPTIONS,
  QUALITY_OPTIONS,
  SectionLabel,
  SegmentedControl,
  SingleSelect,
  TemplatePicker,
  ToggleRow,
} from "./controls";

interface Props {
  festivalId: string;
  value: BadgeConfig;
  onChange: (value: BadgeConfig) => void;
}

function isGridCompatible(
  grid: string,
  orientation: "PORTRAIT" | "LANDSCAPE",
): boolean {
  if (grid === "AUTO") return true;
  const options =
    orientation === "LANDSCAPE"
      ? LANDSCAPE_GRID_OPTIONS
      : PORTRAIT_GRID_OPTIONS;
  return options.some((opt) => opt.value === grid);
}

export function BadgeFilters({ festivalId, value, onChange }: Props) {
  const {
    data: templates,
    isLoading: templatesLoading,
    isError: templatesError,
  } = useExportTemplates(festivalId, "BADGE");
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
    <div className="space-y-3 rounded-lg border p-4">
      <TemplatePicker
        label="Template"
        options={templates ?? []}
        selectedId={value.templateId}
        loading={templatesLoading}
        errorMessage={
          templatesError ? "Couldn't load templates. Try again." : undefined
        }
        onSelect={(id) => {
          const selectedTpl = (templates ?? []).find((t) => t.id === id);
          if (selectedTpl && !value.templateId) {
            const tplOrientation =
              selectedTpl.width > selectedTpl.height ? "LANDSCAPE" : "PORTRAIT";
            if (tplOrientation !== value.pageOrientation) {
              set({
                templateId: id,
                pageOrientation: tplOrientation,
                multiGrid: "AUTO",
              });
              return;
            }
          }
          set({ templateId: id });
        }}
      />

      <FieldGrid cols={2}>
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
      </FieldGrid>

      <FieldGrid cols={2}>
        <SegmentedControl
          label="Page Size"
          value={value.pageSize}
          onChange={(v) => set({ pageSize: v })}
          options={BADGE_PAGE_SIZE_OPTIONS}
        />
        <SegmentedControl
          label="Orientation"
          value={value.pageOrientation}
          onChange={(v) => {
            const nextGrid = isGridCompatible(value.multiGrid, v)
              ? value.multiGrid
              : "AUTO";
            set({ pageOrientation: v, multiGrid: nextGrid });
          }}
          options={PAGE_ORIENTATION_OPTIONS}
        />
      </FieldGrid>

      {value.printLayout === "ONE_PER_PAGE" ? (
        <FieldGrid cols={3}>
          <SegmentedControl
            label="Fit"
            value={value.fit}
            onChange={(v) => set({ fit: v })}
            options={FIT_OPTIONS}
          />
          <NumberInput
            label="Margin"
            hint="Sheet edge padding"
            value={value.marginMm}
            min={0}
            max={20}
            unit="mm"
            onChange={(v) => set({ marginMm: v })}
          />
          <NumberInput
            label="Bleed"
            hint="Cutting overlap border"
            value={value.bleedMm}
            min={0}
            max={6}
            unit="mm"
            onChange={(v) => set({ bleedMm: v })}
          />
        </FieldGrid>
      ) : (
        <>
          <div className="space-y-2">
            <SectionLabel>Per-page grid (cols × rows)</SectionLabel>
            <GridPicker
              value={value.multiGrid}
              orientation={value.pageOrientation}
              onChange={(v) =>
                set({ multiGrid: v as BadgeConfig["multiGrid"] })
              }
            />
          </div>
          <FieldGrid cols={3}>
            <NumberInput
              label="Margin"
              hint="Sheet edge padding"
              value={value.marginMm}
              min={0}
              max={20}
              unit="mm"
              onChange={(v) => set({ marginMm: v })}
            />
            <NumberInput
              label="Gutter"
              hint="Spacing between badges"
              value={value.gutterMm}
              min={0}
              max={20}
              unit="mm"
              onChange={(v) => set({ gutterMm: v })}
            />
            <NumberInput
              label="Bleed"
              hint="Cutting overlap border"
              value={value.bleedMm}
              min={0}
              max={6}
              unit="mm"
              onChange={(v) => set({ bleedMm: v })}
            />
          </FieldGrid>
        </>
      )}

      <FieldGrid cols={2}>
        <ToggleRow
          label="Only chest-numbered"
          checked={value.onlyWithChestNumber}
          onChange={(v) => set({ onlyWithChestNumber: v })}
        />
        <ToggleRow
          label="Crop marks"
          checked={value.drawCropMarks}
          onChange={(v) => set({ drawCropMarks: v })}
        />
      </FieldGrid>

      <ToggleRow
        label="Include editable illustration"
        hint="Bundle the PDF with an editable .ai source inside a single .zip download."
        checked={value.includeAi}
        onChange={(v) => set({ includeAi: v })}
      />

      <SegmentedControl
        label="Gender"
        value={value.gender}
        onChange={(v) => set({ gender: v })}
        options={GENDER_OPTIONS}
      />

      <FieldGrid cols={2}>
        <SingleSelect
          label="Category"
          hint="Required — one category per export keeps the bundle under the Cloudinary Free upload limit."
          required
          options={singleCategories}
          value={value.categoryIds[0] ?? null}
          onChange={(id) => set({ categoryIds: id ? [id] : [] })}
        />
        <SingleSelect
          label="Team"
          hint="Required — one team per export keeps the bundle under the Cloudinary Free upload limit."
          required
          options={teams ?? []}
          value={value.teamIds[0] ?? null}
          onChange={(id) => set({ teamIds: id ? [id] : [] })}
        />
      </FieldGrid>
    </div>
  );
}
