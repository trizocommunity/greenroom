"use client";

import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/core/utils/cn";

function rangeDisabledMatcher(from?: Date, to?: Date) {
  if (!from && !to) return undefined;
  return (day: Date) => (!!from && day < from) || (!!to && day > to);
}

interface DatePickerProps {
  id?: string;
  date?: Date;
  onChange: (date: Date | undefined) => void;
  from?: Date;
  to?: Date;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
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
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onChange}
          defaultMonth={date}
          disabled={rangeDisabledMatcher(from, to)}
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  id?: string;
  value?: DateRange;
  onChange: (value: { from: Date | undefined; to: Date | undefined }) => void;
  from?: Date;
  to?: Date;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

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
  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant={"outline"}
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value?.from && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y")} -{" "}
                  {format(value.to, "LLL dd, y")}
                </>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={(range) => onChange({ from: range?.from, to: range?.to })}
            numberOfMonths={2}
            disabled={rangeDisabledMatcher(from, to)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface DateOfBirthPickerProps {
  id?: string;
  date?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateOfBirthPicker({
  id,
  date,
  onChange,
  placeholder = "Select date",
  disabled,
  className,
}: DateOfBirthPickerProps) {
  const [open, setOpen] = React.useState(false);
  // Controlled displayed month. react-day-picker's `selected` prop only
  // highlights the day — it does NOT move the caption. We track the month
  // and snap it to the bound date each time the popover opens so the caption
  // shows e.g. 2008 (not the current year) for a stored DOB.
  const [displayedMonth, setDisplayedMonth] = React.useState<
    Date | undefined
  >(undefined);
  const today = new Date();
  // Defensive: an Invalid Date instance is truthy but `format()` would throw.
  // Treat it as "no date" until the caller passes a real one.
  const safeDate =
    date && !Number.isNaN(date.getTime()) ? date : undefined;

  // Snap the calendar to the bound date's month whenever the popover opens
  // or the bound date changes from outside.
  React.useEffect(() => {
    if (open) {
      setDisplayedMonth(safeDate);
    }
  }, [open, safeDate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !safeDate && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon />
          {safeDate ? (
            format(safeDate, "PPP")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={safeDate}
          month={displayedMonth}
          onMonthChange={setDisplayedMonth}
          captionLayout="dropdown"
          startMonth={new Date(today.getFullYear() - 100, 0)}
          endMonth={today}
          disabled={{ after: today }}
          onSelect={(d) => {
            onChange(d);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateTimePickerProps {
  id?: string;
  value?: Date | null;
  onChange: (value: Date | null) => void;
  from?: Date;
  to?: Date;
  placeholder?: string;
  disabled?: boolean;
}

export function DateTimePicker({
  id,
  value,
  onChange,
  from,
  to,
  placeholder = "Pick date & time",
  disabled,
}: DateTimePickerProps) {
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(
    value ?? undefined,
  );
  const [time, setTime] = React.useState(
    value ? format(value, "HH:mm") : "09:00",
  );

  React.useEffect(() => {
    setInternalDate(value ?? undefined);
    if (value) {
      setTime(format(value, "HH:mm"));
    }
  }, [value]);

  const commit = (nextDate: Date | undefined, nextTime: string) => {
    if (!nextDate) {
      onChange(null);
      return;
    }
    const [h, m] = nextTime.split(":").map((s) => parseInt(s || "0", 10));
    const withTime = new Date(nextDate);
    withTime.setHours(h || 0, m || 0, 0, 0);
    onChange(withTime);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon />
          {value ? (
            <span>{format(value, "PPP, HH:mm")}</span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 space-y-3" align="start">
        <Calendar
          mode="single"
          selected={internalDate}
          onSelect={(d) => {
            setInternalDate(d ?? undefined);
            commit(d ?? undefined, time);
          }}
          defaultMonth={internalDate}
          disabled={rangeDisabledMatcher(from, to)}
        />
        <div className="flex items-center gap-2 border-t pt-3">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <TimePicker
            value={time}
            onChange={(next) => {
              setTime(next);
              commit(internalDate, next);
            }}
            className="h-8 text-xs"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
