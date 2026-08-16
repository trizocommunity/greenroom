"use client";

import { Calendar, X } from "lucide-react";
import { cn } from "@/core/utils/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * A compact search input with the calendar icon (visual cue only) and a clear
 * button — used by the completed and rejudge section filters.
 */
export function CalendarSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Calendar
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-md border bg-background pl-8 pr-7 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm opacity-70 hover:opacity-100"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Tiny select used by both completed and rejudge filter rows. Renders an
 * "ALL" option as the placeholder and an optional "NONE" entry for filters
 * that need to express "uncategorised".
 */
export function CompactSelect({
  value,
  onChange,
  options,
  placeholder,
  widthClass = "w-[110px]",
  showNone = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  widthClass?: string;
  showNone?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-8 text-xs bg-background", widthClass)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">{placeholder}</SelectItem>
        {showNone && <SelectItem value="NONE">No category</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
