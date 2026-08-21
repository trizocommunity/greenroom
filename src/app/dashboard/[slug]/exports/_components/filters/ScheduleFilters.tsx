"use client";

import { AlertCircle } from "lucide-react";
import { useMemo } from "react";
import { format } from "date-fns";
import { useFestival } from "@/api/client/festivals";
import { useSchedule } from "@/api/client/schedule";

import { DateFilterCombobox } from "@/components/ui/date-filter-combobox";
import { dateKeyLocal, midnightInTz } from "@/core/datetime";
import { Label } from "@/components/ui/label";
import type { ScheduleConfig } from "@/features/exports/schemas/export-config.schema";
import { ToggleRow } from "./controls";

interface Props {
  festivalId: string;
  value: ScheduleConfig;
  onChange: (value: ScheduleConfig) => void;
}

export function ScheduleFilters({ festivalId, value, onChange }: Props) {
  const { data: festival } = useFestival(festivalId);
  const { data: schedule } = useSchedule(festivalId);

  const startDate = festival?.startDate ?? null;
  const endDate = festival?.endDate ?? null;

  const scheduledDayKeys = useMemo(() => {
    if (!schedule) return [];
    const keys = new Set<string>();
    for (const entry of schedule) {
      if (entry.startTime) {
        keys.add(format(new Date(entry.startTime), "yyyy-MM-dd"));
      }
    }
    return Array.from(keys);
  }, [schedule]);

  const availableDates = useMemo(() => {
    if (!startDate || !endDate) return [];
    
    // We generate all dates from startDate to endDate
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
    
    const dates: { key: string; label: string }[] = [];
    let current = new Date(start);
    while (current <= end) {
      const key = format(current, "yyyy-MM-dd");
      dates.push({
        key,
        label: format(current, "MMM d, yyyy"),
      });
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [startDate, endDate]);

  const set = (patch: Partial<ScheduleConfig>) =>
    onChange({ ...value, ...patch });

  const selectedDays = value.days;
  const scheduledSet = useMemo(
    () => new Set(scheduledDayKeys),
    [scheduledDayKeys],
  );
  const hasInvalidSelection =
    selectedDays.length > 0 && !selectedDays.some((d) => scheduledSet.has(d));

  // Convert string[] (yyyy-MM-dd) to Date[] in local timezone for the component
  const dateValues = useMemo(() => {
    return selectedDays.map((d) => {
      const [y, m, day] = d.split("-").map(Number);
      return new Date(y, m - 1, day);
    });
  }, [selectedDays]);

  return (
    <div className="space-y-5 rounded-lg border p-4">
      <div className="space-y-2 flex flex-col">
        <Label>Days to include</Label>
        <p className="text-xs text-muted-foreground">
          Pick one or more festival days. Leave empty to include every day that
          has scheduled sessions.
        </p>
        {availableDates.length === 0 ? (
          <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
            Set the festival start and end dates to enable the day picker.
          </p>
        ) : (
          <>
            <DateFilterCombobox
              value={dateValues}
              onChange={(next: Date[]) =>
                set({ days: next.map((d) => format(d, "yyyy-MM-dd")) })
              }
              availableDates={availableDates}
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
