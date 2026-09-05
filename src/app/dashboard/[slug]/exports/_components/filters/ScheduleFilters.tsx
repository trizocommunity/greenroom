"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";
import { useMemo } from "react";
import { useFestival } from "@/api/client/festivals";
import { useSchedule } from "@/api/client/schedule";

import { DateFilterCombobox } from "@/components/ui/date-filter-combobox";
import { Label } from "@/components/ui/label";
import { dateKeyLocal, midnightInTz } from "@/core/datetime";
import { getScheduleExportDatesAction } from "@/features/exports/actions/export.actions";
import type { ScheduleConfig } from "@/features/exports/schemas/export-config.schema";
import { SegmentedControl, TIME_DISPLAY_OPTIONS, ToggleRow } from "./controls";

interface Props {
  festivalId: string;
  value: ScheduleConfig;
  onChange: (value: ScheduleConfig) => void;
}

export function ScheduleFilters({ festivalId, value, onChange }: Props) {
  const { data: festival } = useFestival(festivalId);
  const { data: schedule } = useSchedule(festivalId);

  const { data: exportDates } = useQuery({
    queryKey: ["schedule-export-dates", festivalId],
    queryFn: async () => {
      const res = await getScheduleExportDatesAction(festivalId);
      if (!res.success) return null;
      return res.data;
    },
    enabled: !!festivalId,
    staleTime: 30_000,
  });

  const startDate = festival?.startDate ?? null;
  const endDate = festival?.endDate ?? null;

  const activeDayKeys = useMemo(() => {
    const keys = new Set<string>();
    if (schedule) {
      for (const entry of schedule) {
        if (entry.startTime) {
          keys.add(format(new Date(entry.startTime), "yyyy-MM-dd"));
        }
      }
    }
    if (exportDates) {
      for (const k of exportDates.scheduledDayKeys) keys.add(k);
      for (const k of exportDates.reportingDayKeys) keys.add(k);
    }
    return Array.from(keys);
  }, [schedule, exportDates]);

  const availableDates = useMemo(() => {
    const dateMap = new Map<string, string>();

    // 1. Generate all dates from startDate to endDate
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const current = new Date(start);
        while (current <= end) {
          const key = format(current, "yyyy-MM-dd");
          dateMap.set(key, format(current, "MMM d, yyyy"));
          current.setDate(current.getDate() + 1);
        }
      }
    }

    // 2. Also include all dates where scheduled entries or reporting for unscheduled happened
    for (const key of activeDayKeys) {
      if (!dateMap.has(key)) {
        const [y, m, d] = key.split("-").map(Number);
        const dt = new Date(y, m - 1, d);
        dateMap.set(key, format(dt, "MMM d, yyyy"));
      }
    }

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, label]) => ({ key, label }));
  }, [startDate, endDate, activeDayKeys]);

  const set = (patch: Partial<ScheduleConfig>) =>
    onChange({ ...value, ...patch });

  const selectedDays = value.days;
  const activeSet = useMemo(() => new Set(activeDayKeys), [activeDayKeys]);
  const hasInvalidSelection =
    selectedDays.length > 0 && !selectedDays.some((d) => activeSet.has(d));

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
          has scheduled sessions or reported programmes.
        </p>
        {availableDates.length === 0 ? (
          <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
            Set the festival start and end dates or add schedule entries to
            enable the day picker.
          </p>
        ) : (
          <>
            <DateFilterCombobox
              value={dateValues}
              onChange={(next: Date[]) =>
                set({ days: next.map((d) => format(d, "yyyy-MM-dd")) })
              }
              availableDates={availableDates}
              placeholder="All days with sessions or reporting"
            />
            {hasInvalidSelection ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  No sessions or reporting entries found for the selected days.
                  Pick days that have entries or clear the selection.
                </span>
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="space-y-2.5">
        <SegmentedControl
          label="Time format"
          value={value.timeDisplay}
          options={TIME_DISPLAY_OPTIONS}
          onChange={(v) => set({ timeDisplay: v })}
        />
        <div className="pt-2 border-t" />
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
