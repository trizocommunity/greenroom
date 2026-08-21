"use client";

import { Calendar, ChevronsUpDown, X } from "lucide-react";
import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  dateKeyLocal,
  formatDate,
  midnightInTz,
  relativeDayKey,
  relativeDayLabel,
} from "@/core/datetime";
import { cn } from "@/core/utils/cn";

interface DateFilterComboboxProps {
  /** Selected dates. Empty array means "All Dates" (no filter). */
  value: Date[];
  onChange: (v: Date[]) => void;
  /**
   * Optional list of dates that have actual data, in the order they should
   * appear. Each entry is `{ key: "YYYY-MM-DD", label: "Aug 17, 2026" }`.
   * When provided, a "Scheduled days" group is rendered (excluding any
   * dates that already appear in the Quick filters section).
   */
  availableDates?: Array<{ key: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

type QuickRel = "YESTERDAY" | "TODAY" | "TOMORROW";

interface QuickRow {
  rel: QuickRel;
  key: string;
  label: string;
}

/**
 * A search-enabled, multi-select date filter combobox.
 *
 * 3 sections:
 * 1. **All Dates** – clears all picks, shows everything.
 * 2. **Quick filters** – Yesterday, Today, Tomorrow (checkbox toggle).
 * 3. **Scheduled days** – sourced from `availableDates`, excluding any
 *    dates that overlap with the quick filters.
 *
 * Empty `value` array means "show all" (no date filter active).
 * Non-empty array contains the specific Date objects selected.
 *
 * The component always emits `Date` objects at midnight in `displayTz`.
 */
export function DateFilterCombobox({
  value,
  onChange,
  availableDates,
  placeholder = "All Dates",
  disabled,
  className,
}: DateFilterComboboxProps) {
  const [open, setOpen] = React.useState(false);

  // ── Relative day keys ──
  const now = React.useMemo(() => new Date(), []);
  const todayKey = React.useMemo(() => dateKeyLocal(now), [now]);
  const yesterdayKey = React.useMemo(
    () => dateKeyLocal(new Date(now.getTime() - 86_400_000)),
    [now],
  );
  const tomorrowKey = React.useMemo(
    () => dateKeyLocal(new Date(now.getTime() + 86_400_000)),
    [now],
  );

  const quickKeys = React.useMemo(
    () => new Set([yesterdayKey, todayKey, tomorrowKey]),
    [yesterdayKey, todayKey, tomorrowKey],
  );

  // ── Selected state as a Set of date keys ──
  const selectedKeys = React.useMemo(
    () => new Set(value.map((d) => dateKeyLocal(d))),
    [value],
  );

  const isAllDates = value.length === 0;

  // ── Toggle a single date key ──
  const toggle = React.useCallback(
    (key: string) => {
      const next = new Set(selectedKeys);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      // Convert keys back to Date objects
      if (next.size === 0) {
        onChange([]);
      } else {
        onChange(Array.from(next).map((k) => midnightInTzDate(k)));
      }
    },
    [selectedKeys, onChange],
  );

  const selectAllDates = React.useCallback(() => {
    onChange([]);
  }, [onChange]);

  // Collect all selectable keys (quick + scheduled)
  const allSelectableKeys = React.useMemo(() => {
    const keys = [yesterdayKey, todayKey, tomorrowKey];
    if (availableDates) {
      for (const d of availableDates) {
        if (!quickKeys.has(d.key)) {
          keys.push(d.key);
        }
      }
    }
    return keys;
  }, [yesterdayKey, todayKey, tomorrowKey, availableDates, quickKeys]);

  const selectAll = React.useCallback(() => {
    onChange(allSelectableKeys.map((k) => midnightInTzDate(k)));
  }, [allSelectableKeys, onChange]);

  const clearAll = React.useCallback(() => {
    onChange([]);
  }, [onChange]);

  const allIndividualSelected =
    allSelectableKeys.length > 0 &&
    allSelectableKeys.every((k) => selectedKeys.has(k));

  // ── Scheduled days (excluding quick filter dates) ──
  const scheduledDays = React.useMemo(() => {
    if (!availableDates || availableDates.length === 0) return [];
    return availableDates.filter((d) => !quickKeys.has(d.key));
  }, [availableDates, quickKeys]);

  // ── Trigger label ──
  const triggerLabel = React.useMemo(() => {
    if (isAllDates) return placeholder;
    if (value.length === 1) {
      const key = dateKeyLocal(value[0]!);
      if (key === todayKey) return relativeDayLabel("TODAY");
      if (key === yesterdayKey) return relativeDayLabel("YESTERDAY");
      if (key === tomorrowKey) return relativeDayLabel("TOMORROW");
      return formatDate(value[0]!, { style: "medium" });
    }
    return `${value.length} days selected`;
  }, [isAllDates, value, todayKey, yesterdayKey, tomorrowKey, placeholder]);

  // ── Search token builders ──
  const tokensForQuickDay = (rel: QuickRel, key: string): string =>
    [rel.toLowerCase(), relativeDayLabel(rel), key, formattedLongLabel(key)]
      .filter(Boolean)
      .join(" ");

  const tokensForScheduledDay = (d: { key: string; label: string }): string =>
    [d.label, d.key, formattedLongLabel(d.key)].filter(Boolean).join(" ");

  const hasValue = value.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/*
         * Trigger is a <div role="combobox"> rather than a <button> so the
         * inner clear-X button can legally live alongside it.
         */}
        <div
          role="combobox"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Filter by date"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((o) => !o);
            }
          }}
          className={cn(
            "flex h-9 w-full min-w-[180px] items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            !hasValue && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <Calendar className="h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">{triggerLabel}</span>
          </span>
          <div className="flex items-center shrink-0">
            {hasValue ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange([]);
                }}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear date filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search date..." />
          <CommandList className="max-h-72">
            <CommandEmpty>No date found.</CommandEmpty>

            {/* ── Section 1: All Dates ── */}
            <CommandGroup heading="All Dates">
              <CommandItem
                value="all dates clear filter"
                onSelect={selectAllDates}
                className="flex items-center gap-3"
              >
                <Checkbox
                  checked={isAllDates}
                  aria-label="Show all dates"
                  className="pointer-events-none"
                />
                <span className="flex-1 truncate">All Dates</span>
              </CommandItem>
            </CommandGroup>

            {/* ── Section 2: Quick Filters ── */}
            <CommandGroup heading="Quick filters">
              <CommandItem
                value={tokensForQuickDay("YESTERDAY", yesterdayKey)}
                onSelect={() => toggle(yesterdayKey)}
                className="flex items-center gap-3"
              >
                <Checkbox
                  checked={selectedKeys.has(yesterdayKey)}
                  aria-label="Include Yesterday"
                  className="pointer-events-none"
                />
                <span className="flex-1 truncate">Yesterday</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {yesterdayKey}
                </span>
              </CommandItem>
              <CommandItem
                value={tokensForQuickDay("TODAY", todayKey)}
                onSelect={() => toggle(todayKey)}
                className="flex items-center gap-3"
              >
                <Checkbox
                  checked={selectedKeys.has(todayKey)}
                  aria-label="Include Today"
                  className="pointer-events-none"
                />
                <span className="flex-1 truncate">Today</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {todayKey}
                </span>
              </CommandItem>
              <CommandItem
                value={tokensForQuickDay("TOMORROW", tomorrowKey)}
                onSelect={() => toggle(tomorrowKey)}
                className="flex items-center gap-3"
              >
                <Checkbox
                  checked={selectedKeys.has(tomorrowKey)}
                  aria-label="Include Tomorrow"
                  className="pointer-events-none"
                />
                <span className="flex-1 truncate">Tomorrow</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {tomorrowKey}
                </span>
              </CommandItem>
            </CommandGroup>

            {/* ── Section 3: Scheduled days (excluding quick filter dates) ── */}
            {scheduledDays.length > 0 ? (
              <CommandGroup heading="Scheduled days">
                {scheduledDays.map((d) => (
                  <CommandItem
                    key={d.key}
                    value={tokensForScheduledDay(d)}
                    onSelect={() => toggle(d.key)}
                    className="flex items-center gap-3"
                  >
                    <Checkbox
                      checked={selectedKeys.has(d.key)}
                      aria-label={`Include ${d.label}`}
                      className="pointer-events-none"
                    />
                    <span className="flex-1 truncate">{d.label}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {d.key}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>

          {/* ── Footer bar ── */}
          <div className="flex items-center justify-between border-t px-2 py-1.5">
            <button
              type="button"
              onClick={selectAll}
              disabled={allIndividualSelected}
              className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Select all
            </button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {value.length}/{allSelectableKeys.length}
            </span>
            <button
              type="button"
              onClick={clearAll}
              disabled={isAllDates}
              className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function midnightInTzDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formattedLongLabel(key: string): string {
  try {
    const [y, m, d] = key.split("-").map(Number);
    return formatDate(new Date(y, m - 1, d, 12, 0), { style: "long" });
  } catch {
    return "";
  }
}
