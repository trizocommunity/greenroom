"use client";

import { useCategories } from "@/api/client/categories";
import { useExportTemplates } from "@/api/client/exports";
import { useProgrammes } from "@/api/client/programmes";
import type { CertificateConfig } from "@/features/exports/schemas/export-config.schema";
import {
  CheckList,
  PRINT_LAYOUT_OPTIONS,
  QUALITY_OPTIONS,
  SegmentedControl,
  TemplatePicker,
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
  const { data: templates } = useExportTemplates(festivalId, "CERTIFICATE");
  const { data: categories } = useCategories(festivalId);
  const { data: programmes } = useProgrammes(festivalId);
  const set = (patch: Partial<CertificateConfig>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="space-y-5 rounded-lg border p-4">
      <TemplatePicker
        label="Template"
        options={templates ?? []}
        selectedId={value.templateId}
        onSelect={(id) => set({ templateId: id })}
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
    </div>
  );
}
