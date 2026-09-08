"use client";

import { useCategories } from "@/api/client/categories";
import { useExportTemplates } from "@/api/client/exports";
import { useProgrammes } from "@/api/client/programmes";
import type { CertificateConfig } from "@/features/exports/schemas/export-config.schema";
import {
  CERTIFICATE_PAGE_SIZE_OPTIONS,
  CheckList,
  FIT_OPTIONS,
  FieldGrid,
  NumberInput,
  PAGE_ORIENTATION_OPTIONS,
  QUALITY_OPTIONS,
  SegmentedControl,
  SingleSelect,
  TemplatePicker,
  ToggleRow,
  toggleId,
} from "./controls";

interface Props {
  festivalId: string;
  value: CertificateConfig;
  onChange: (value: CertificateConfig) => void;
}

type CertType = CertificateConfig["certificateTypes"][number];

const CERT_TYPE_OPTIONS: { id: CertType; name: string }[] = [
  { id: "PARTICIPATION", name: "Participation" },
  { id: "FIRST", name: "1st Place" },
  { id: "SECOND", name: "2nd Place" },
  { id: "THIRD", name: "3rd Place" },
  { id: "COMMON_PRIZE", name: "Common Prize" },
  { id: "GRADE", name: "Grade" },
];

export function CertificateFilters({ festivalId, value, onChange }: Props) {
  const {
    data: templates,
    isLoading: templatesLoading,
    isError: templatesError,
  } = useExportTemplates(festivalId, "CERTIFICATE");
  const { data: categories } = useCategories(festivalId);
  const { data: programmes } = useProgrammes(festivalId);
  const set = (patch: Partial<CertificateConfig>) =>
    onChange({ ...value, ...patch });

  // Exclude GENERAL categories — they aren't meaningful for per-participant
  // certificates and would inflate the export unnecessarily.
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
        onSelect={(id) => set({ templateId: id })}
      />

      <FieldGrid cols={2}>
        <SegmentedControl
          label="Export Quality"
          value={value.quality}
          onChange={(v) => set({ quality: v })}
          options={QUALITY_OPTIONS}
        />
        {/* Certificates always render ONE_PER_PAGE — no layout picker. */}
        <div /> {/* spacer to preserve 2-col grid */}
      </FieldGrid>

      <FieldGrid cols={2}>
        <SegmentedControl
          label="Page Size"
          value={value.pageSize}
          onChange={(v) => set({ pageSize: v })}
          options={CERTIFICATE_PAGE_SIZE_OPTIONS}
        />
        <SegmentedControl
          label="Orientation"
          value={value.pageOrientation}
          onChange={(v) => set({ pageOrientation: v })}
          options={PAGE_ORIENTATION_OPTIONS}
        />
      </FieldGrid>

      <FieldGrid cols={3}>
        <SegmentedControl
          label="Fit"
          value={value.fit}
          onChange={(v) => set({ fit: v })}
          options={FIT_OPTIONS}
        />
        <NumberInput
          label="Margin"
          hint="mm"
          value={value.marginMm}
          min={0}
          max={20}
          onChange={(v) => set({ marginMm: v })}
        />
        <NumberInput
          label="Bleed"
          hint="mm"
          value={value.bleedMm}
          min={0}
          max={6}
          onChange={(v) => set({ bleedMm: v })}
        />
      </FieldGrid>

      <ToggleRow
        label="Crop marks"
        checked={value.drawCropMarks}
        onChange={(v) => set({ drawCropMarks: v })}
      />

      <ToggleRow
        label="Include editable illustration"
        hint="Bundle the PDF with an editable .ai source inside a single .zip download."
        checked={value.includeAi}
        onChange={(v) => set({ includeAi: v })}
      />

      <CheckList
        label="Certificate Types"
        options={CERT_TYPE_OPTIONS}
        selected={value.certificateTypes}
        onToggle={(id, v) =>
          set({
            certificateTypes: toggleId(
              value.certificateTypes,
              id,
              v,
            ) as CertType[],
          })
        }
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
          label="Programme"
          hint="Required — one programme per export keeps the bundle under the Cloudinary Free upload limit."
          required
          options={programmes ?? []}
          value={value.programmeIds[0] ?? null}
          onChange={(id) => set({ programmeIds: id ? [id] : [] })}
        />
      </FieldGrid>
    </div>
  );
}
