"use client";

import { formatInTimeZone } from "date-fns-tz";
import { CalendarIcon, Clock } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { composePickerRange } from "@/components/ui/date-picker-utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";
import { DEFAULT_TZ } from "@/core/datetime";
import { cn } from "@/core/utils/cn";

export interface DateRangeValue {
  start: Date | null;
  end: Date | null;
}

interface DateRangePickerProps {
  id?: string;
  value?: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  from?: Date;
  to?: Date;
  placeholder?: string;
  disabled?: boolean;
  /**
   * IANA timezone the picked wall-clock is anchored to. Defaults to
   * `DEFAULT_TZ` (`"UTC"`). Festival-scoped pickers must pass
   * `festival.timezone` so the stored UTC instant round-trips correctly
   * regardless of the admin's browser TZ.
   */
  tz?: string;
}

const DEFAULT_START_TIME = "00:00";
const DEFAULT_END_TIME = "23:00";

function formatBound(value: Date | null | undefined, tz: string): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return formatInTimeZone(d, tz, "MMM d, h:mm a");
}

export function DateRangePicker({
  id,
  value,
  onChange,
  from,
  to,
  placeholder = "Pick a date range",
  disabled,
  tz = DEFAULT_TZ,
}: DateRangePickerProps) {
  const start = value?.start ?? null;
  const end = value?.end ?? null;

  const [internalRange, setInternalRange] = React.useState<
    DateRange | undefined
  >(() => ({
    from: start ?? undefined,
    to: end ?? undefined,
  }));
  const [startTime, setStartTime] = React.useState(
    start ? formatInTimeZone(start, tz, "HH:mm") : DEFAULT_START_TIME,
  );
  const [endTime, setEndTime] = React.useState(
    end ? formatInTimeZone(end, tz, "HH:mm") : DEFAULT_END_TIME,
  );

  React.useEffect(() => {
    setInternalRange({ from: start ?? undefined, to: end ?? undefined });
    if (start) setStartTime(formatInTimeZone(start, tz, "HH:mm"));
    if (end) setEndTime(formatInTimeZone(end, tz, "HH:mm"));
  }, [start, end, tz]);

  const disabledMatcher = (() => {
    if (!from && !to) return undefined;
    return (day: Date) => (!!from && day < from) || (!!to && day > to);
  })();

  const commit = (nextRange: DateRange | undefined) => {
    if (!nextRange) {
      setInternalRange(undefined);
      onChange({ start: null, end: null });
      return;
    }
    setInternalRange(nextRange);
    onChange(
      composePickerRange(nextRange.from, nextRange.to, startTime, endTime, tz),
    );
  };

  const handleStartTimeChange = (next: string) => {
    setStartTime(next);
    if (internalRange?.from) {
      onChange(
        composePickerRange(
          internalRange.from,
          internalRange.to,
          next,
          endTime,
          tz,
        ),
      );
    }
  };

  const handleEndTimeChange = (next: string) => {
    setEndTime(next);
    if (internalRange?.to) {
      onChange(
        composePickerRange(
          internalRange.from,
          internalRange.to,
          startTime,
          next,
          tz,
        ),
      );
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !start && !end && "text-muted-foreground",
          )}
        >
          <CalendarIcon />
          {start || end ? (
            <span>
              {formatBound(start, tz)} → {formatBound(end, tz)}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto space-y-3 p-3" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={internalRange}
          onSelect={commit}
          defaultMonth={internalRange?.from}
          disabled={disabledMatcher}
        />
        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <TimePicker
              value={startTime}
              onChange={handleStartTimeChange}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <TimePicker
              value={endTime}
              onChange={handleEndTimeChange}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
