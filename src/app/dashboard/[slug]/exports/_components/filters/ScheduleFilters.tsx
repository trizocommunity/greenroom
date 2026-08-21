"use client";

import { AlertCircle } from "lucide-react";
import { useMemo } from "react";

import {
  buildScheduleDayOptions,
  ScheduleDaysMultiSelect,
} from "@/app/dashboard/[slug]/exports/_components/filters/ScheduleDaysMultiSelect";
import { Label } from "@/components/ui/label";
import type { ScheduleConfig } from "@/features/exports/schemas/export-config.schema";
import { ToggleRow } from "./controls";

interface Props {
  festivalId: string;
  value: ScheduleConfig;
  onChange: (value: ScheduleConfig) => void;
  startDate: string | null;
  endDate: string | null;
  /** Calendar day keys (yyyy-MM-dd) that have at least one schedule entry. */
  scheduledDayKeys: string[];
}

export function ScheduleFilters({
  value,
  onChange,
  startDate,
  endDate,
  scheduledDayKeys,
}: Props) {
  const dayOptions = useMemo(
    () => buildScheduleDayOptions(startDate, endDate),
    [startDate, endDate],
  );

  const set = (patch: Partial<ScheduleConfig>) =>
    onChange({ ...value, ...patch });

  const selectedDays = value.days;
  const scheduledSet = useMemo(
    () => new Set(scheduledDayKeys),
    [scheduledDayKeys],
  );
  const hasInvalidSelection =
    selectedDays.length > 0 && !selectedDays.some((d) => scheduledSet.has(d));

  return (
    <div className="space-y-5 rounded-lg border p-4">
      <div className="space-y-2">
        <Label>Days to include</Label>
        <p className="text-xs text-muted-foreground">
          Pick one or more festival days. Leave empty to include every day that
          has scheduled sessions.
        </p>
        {dayOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
            Set the festival start and end dates to enable the day picker.
          </p>
        ) : (
          <>
            <ScheduleDaysMultiSelect
              value={value.days}
              onChange={(next) => set({ days: next })}
              options={dayOptions}
              placeholder="All festival days with sessions"
            />
            {hasInvalidSelection ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  No sessions scheduled for the selected days. Pick days that
                  have entries or clear the selection.
                </span>
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="space-y-2.5">
        <ToggleRow
          label="Include entry type (programme / session)"
          checked={value.includeEntryType}
          onChange={(v) => set({ includeEntryType: v })}
        />
        <ToggleRow
          label="Include stage"
          checked={value.includeStage}
          onChange={(v) => set({ includeStage: v })}
        />
        <ToggleRow
          label="Include description"
          checked={value.includeDescription}
          onChange={(v) => set({ includeDescription: v })}
        />
        <ToggleRow
          label="Include speakers"
          checked={value.includeSpeakers}
          onChange={(v) => set({ includeSpeakers: v })}
        />
      </div>
    </div>
  );
}
