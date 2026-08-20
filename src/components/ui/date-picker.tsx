"use client";

import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { composePickerValue } from "@/components/ui/date-picker-utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/core/utils/cn";

export interface DatePickerProps {
  id?: string;
  date?: Date;
  onChange: (date: Date | undefined) => void;
  from?: Date;
  to?: Date;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function formatBound(value: Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, h:mm a");
}

export function DatePicker({
  id,
  date,
  onChange,
  from,
  to,
  placeholder = "Pick a date",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [time, setTime] = React.useState(
    date ? format(date, "HH:mm") : "09:00",
  );

  React.useEffect(() => {
    setTime(date ? format(date, "HH:mm") : "09:00");
  }, [date]);

  const disabledMatcher = (() => {
    if (!from && !to) return undefined;
    return (day: Date) => (!!from && day < from) || (!!to && day > to);
  })();

  const commit = (next: Date | undefined) => {
    if (!next) {
      onChange(undefined);
      return;
    }
    onChange(composePickerValue(next, time));
  };

  const handleTimeChange = (next: string) => {
    setTime(next);
    if (date) {
      onChange(composePickerValue(date, next));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon />
          {date ? formatBound(date) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={commit}
          defaultMonth={date}
          disabled={disabledMatcher}
        />
        <div className="flex items-center gap-2 border-t p-3">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <TimePicker
            value={time}
            onChange={handleTimeChange}
            className="h-8 text-xs"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface DateOfBirthPickerProps {
  id?: string;
  date?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Single-day date picker for date-of-birth inputs. Calls back with a
 * `Date` whose `getFullYear/getMonth/getDate` reflect the picked day in
 * the browser-local timezone. Calendar bounds are clamped to reasonable
 * DOB range (year 1900 → today).
 */
export function DateOfBirthPicker({
  id,
  date,
  onChange,
  placeholder = "Select date of birth",
  disabled,
  className,
}: DateOfBirthPickerProps) {
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const start = React.useMemo(() => new Date(1900, 0, 1), []);

  return (
    <DatePicker
      id={id}
      date={date}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      from={start}
      to={today}
    />
  );
}

export interface DateRangeValue {
  from: Date | undefined;
  to: Date | undefined;
}

export interface DateRangePickerProps {
  id?: string;
  value?: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  from?: Date;
  to?: Date;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_START_TIME = "00:00";
const DEFAULT_END_TIME = "23:00";

export function DateRangePicker({
  id,
  value,
  onChange,
  from,
  to,
  placeholder = "Pick a date range",
  disabled,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [startTime, setStartTime] = React.useState(
    value?.from ? format(value.from, "HH:mm") : DEFAULT_START_TIME,
  );
  const [endTime, setEndTime] = React.useState(
    value?.to ? format(value.to, "HH:mm") : DEFAULT_END_TIME,
  );

  const disabledMatcher = (() => {
    if (!from && !to) return undefined;
    return (day: Date) => (!!from && day < from) || (!!to && day > to);
  })();

  const commit = (next: DateRange | undefined) => {
    if (!next || !next.from) {
      onChange({ from: undefined, to: undefined });
      return;
    }
    onChange({
      from: composePickerValue(next.from, startTime),
      to: next.to ? composePickerValue(next.to, endTime) : undefined,
    });
  };

  const handleStartTimeChange = (next: string) => {
    setStartTime(next);
    if (value?.from) {
      onChange({
        from: composePickerValue(value.from, next),
        to: value.to,
      });
    }
  };

  const handleEndTimeChange = (next: string) => {
    setEndTime(next);
    if (value?.to) {
      onChange({
        from: value.from,
        to: composePickerValue(value.to, next),
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value?.from && !value?.to && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon />
          {value?.from ? (
            value.to ? (
              <>
                {formatBound(value.from)} – {formatBound(value.to)}
              </>
            ) : (
              formatBound(value.from)
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={{ from: value?.from, to: value?.to }}
          onSelect={commit}
          defaultMonth={value?.from}
          disabled={disabledMatcher}
        />
        <div className="flex items-center gap-2 border-t p-3">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <TimePicker
            value={startTime}
            onChange={handleStartTimeChange}
            className="h-8 text-xs"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
