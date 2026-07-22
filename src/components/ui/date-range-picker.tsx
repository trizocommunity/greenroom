"use client";

import { format, isSameDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/core/utils/cn";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  id?: string;
  value?: DateRange;
  onChange: (value: DateRange) => void;
  from?: Date;
  to?: Date;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showValidityHint?: boolean;
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
  showValidityHint = false,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const range = value ?? { from: undefined, to: undefined };
  const isEmpty = !range.from && !range.to;

  const hintLabel = () => {
    if (!showValidityHint || (!from && !to)) return null;
    const parts: string[] = [];
    if (from) parts.push(`From ${format(from, "MMM d, yyyy")}`);
    if (to) parts.push(`Until ${format(to, "MMM d, yyyy")}`);
    return parts.join(" • ");
  };

  const displayLabel = () => {
    if (range.from && range.to) {
      if (isSameDay(range.from, range.to)) {
        return format(range.from, "PPP");
      }
      return `${format(range.from, "MMM d")} - ${format(range.to, "MMM d, yyyy")}`;
    }
    if (range.from) {
      return `${format(range.from, "MMM d, yyyy")} - Select end`;
    }
    return placeholder;
  };

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            disabled={disabled}
            data-empty={isEmpty || undefined}
            className={cn(
              "w-full justify-start text-left font-normal",
              !range.from && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">{displayLabel()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: range.from, to: range.to }}
            onSelect={(selection) => {
              if (
                selection?.from &&
                selection?.to &&
                selection.from > selection.to
              ) {
                return;
              }
              onChange({ from: selection?.from, to: selection?.to });
              if (selection?.from && selection?.to) {
                setOpen(false);
              }
            }}
            defaultMonth={range.from ?? new Date()}
            disabled={
              from || to
                ? (day) => (!!from && day < from) || (!!to && day > to)
                : undefined
            }
            numberOfMonths={2}
          />
          {(range.from || range.to) && (
            <div className="p-3 border-t border-border/50 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange({ from: undefined, to: undefined });
                  setOpen(false);
                }}
                className="text-xs h-8"
              >
                Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {showValidityHint && hintLabel() && (
        <p className="text-xs text-muted-foreground">{hintLabel()}</p>
      )}
    </div>
  );
}
