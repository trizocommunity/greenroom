"use client";

import { useCategories } from "@/api/client/categories";
import { useGroups } from "@/api/client/groups";
import { useProgrammes } from "@/api/client/programmes";
import { useStages } from "@/api/client/stages";
import type { CallListConfig } from "@/features/exports/schemas/export-config.schema";
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
  value: CallListConfig;
  onChange: (value: CallListConfig) => void;
}

export function CallListFilters({ festivalId, value, onChange }: Props) {
  const { data: categories } = useCategories(festivalId);
  const { data: programmes } = useProgrammes(festivalId);
  const { data: groups } = useGroups(festivalId);
  const { data: stages } = useStages(festivalId);
  const set = (patch: Partial<CallListConfig>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="space-y-5 rounded-lg border p-4">
      <ToggleRow
        label="Only programmes with participants"
        checked={value.onlyWithParticipants}
        onChange={(v) => set({ onlyWithParticipants: v })}
      />
      <SegmentedControl
        label="Call List Type"
        value={value.listType}
        onChange={(v) => set({ listType: v })}
        options={[
          { value: "PROGRAMME_WISE", label: "Programme-wise" },
          { value: "TEAM_WISE", label: "Team-wise" },
        ]}
      />
      <SegmentedControl
        label="Programme Type"
        value={value.programmeType ?? "ALL"}
        onChange={(v) => set({ programmeType: v })}
        options={[
          { value: "ALL", label: "All" },
          { value: "INDIVIDUAL", label: "Individual" },
          { value: "GROUP", label: "Group" },
        ]}
      />
      <SegmentedControl
        label="Gender filter"
        value={value.gender}
        onChange={(v) => set({ gender: v })}
        options={GENDER_OPTIONS}
      />
      <SegmentedControl
        label="Sort Order"
        value={value.sortBy ?? "CHEST_NUMBER"}
        onChange={(v) => set({ sortBy: v })}
        options={[
          { value: "CHEST_NUMBER", label: "Chest No" },
          { value: "NAME", label: "Name" },
          { value: "TEAM", label: "Team" },
        ]}
      />

      <div className="space-y-2.5">
        <ToggleRow
          label="Include chest number"
          checked={value.includeChestNumber}
          onChange={(v) => set({ includeChestNumber: v })}
        />
        <ToggleRow
          label="Include category"
          checked={value.includeCategory}
          onChange={(v) => set({ includeCategory: v })}
        />
        <ToggleRow
          label="Include team"
          checked={value.includeTeam}
          onChange={(v) => set({ includeTeam: v })}
        />
        <ToggleRow
          label="Include stage & schedule"
          checked={value.includeStage ?? false}
          onChange={(v) => set({ includeStage: v })}
        />
        <ToggleRow
          label="Include date of birth"
          checked={value.includeDob}
          onChange={(v) => set({ includeDob: v })}
        />
        <ToggleRow
          label="Include phone number"
          checked={value.includePhone}
          onChange={(v) => set({ includePhone: v })}
        />
        <ToggleRow
          label="Include attendance / signature column"
          checked={value.includeSignatureLine ?? false}
          onChange={(v) => set({ includeSignatureLine: v })}
        />
        <ToggleRow
          label="Include remarks column"
          checked={value.includeRemarks ?? false}
          onChange={(v) => set({ includeRemarks: v })}
        />
      </div>

      <SegmentedControl
        label="Schedule state"
        value={value.scheduleState}
        onChange={(v) => set({ scheduleState: v })}
        options={[
          { value: "ALL", label: "All" },
          { value: "SCHEDULED", label: "Scheduled" },
          { value: "UNSCHEDULED", label: "Unscheduled" },
        ]}
      />

      <CheckList
        label="Groups / Teams"
        hint="Leave empty to include all groups"
        options={groups ?? []}
        selected={value.teamIds ?? []}
        onToggle={(id, v) =>
          set({ teamIds: toggleId(value.teamIds ?? [], id, v) })
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
      <CheckList
        label="Scheduled stages"
        hint="Leave empty to include all stages"
        options={stages ?? []}
        selected={value.stageIds}
        onToggle={(id, v) => set({ stageIds: toggleId(value.stageIds, id, v) })}
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
