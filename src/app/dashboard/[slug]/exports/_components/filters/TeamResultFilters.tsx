"use client";

import { useGroups } from "@/api/client/groups";
import type { TeamResultConfig } from "@/features/exports/schemas/export-config.schema";
import {
  CheckList,
  GENDER_OPTIONS,
  SegmentedControl,
  ToggleRow,
  toggleId,
} from "./controls";

interface Props {
  festivalId: string;
  value: TeamResultConfig;
  onChange: (value: TeamResultConfig) => void;
}

export function TeamResultFilters({ festivalId, value, onChange }: Props) {
  const { data: teams } = useGroups(festivalId);
  const set = (patch: Partial<TeamResultConfig>) =>
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
        label="Only published results"
        checked={value.onlyPublished}
        onChange={(v) => set({ onlyPublished: v })}
      />
      <ToggleRow
        label="Include award points"
        checked={value.includeAwardPoints}
        onChange={(v) => set({ includeAwardPoints: v })}
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
