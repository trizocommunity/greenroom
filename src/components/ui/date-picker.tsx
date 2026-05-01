"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDownIcon, Clock } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/core/utils/cn";

interface DatePickerProps {
  id?: string;
  date?: Date;
  onChange: (date: Date | undefined) => void;
  from?: Date;
  to?: Date;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showValidityHint?: boolean; // Show hint about valid date range
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
  showValidityHint = false,
}: DatePickerProps) {
  const isEmpty = !date;

  const hintLabel = () => {
    if (!showValidityHint || (!from && !to)) return null;
    const parts: string[] = [];
    if (from) parts.push(`From ${format(from, "MMM d, yyyy")}`);
    if (to) parts.push(`Until ${format(to, "MMM d, yyyy")}`);
    return parts.join(" • ");
  };

  return (
    <div className="space-y-1.5">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id={id}
            disabled={disabled}
            data-empty={isEmpty || undefined}
            className={cn(
              // Match Input visual style / sizing
              "flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm shadow-sm transition-colors justify-between text-left font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          >
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
            <ChevronDownIcon className="ml-2 h-4 w-4 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onChange}
            defaultMonth={date}
            disabled={
              from || to
                ? (day) => (!!from && day < from) || (!!to && day > to)
                : undefined
            }
          />
        </PopoverContent>
      </Popover>
      {showValidityHint && hintLabel() && (
        <p className="text-xs text-muted-foreground">{hintLabel()}</p>
      )}
    </div>
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

  const isEmpty = !value;

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
          type="button"
          id={id}
          disabled={disabled}
          data-empty={isEmpty || undefined}
          className={cn(
            // Match Input visual style / sizing
            "flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm shadow-sm transition-colors justify-between text-left font-normal data-[empty=true]:text-muted-foreground",
          )}
        >
          {value ? (
            <span>{format(value, "PPP, HH:mm")}</span>
          ) : (
            <span>{placeholder}</span>
          )}
          <CalendarIcon className="ml-2 h-4 w-4 opacity-70" />
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
          disabled={
            from || to
              ? (day) => (!!from && day < from) || (!!to && day > to)
              : undefined
          }
        />
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Input
            type="time"
            value={time}
            onChange={(e) => {
              const next = e.target.value || "00:00";
              setTime(next);
              commit(internalDate, next);
            }}
            className="h-8 w-[110px]"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
