"use client";

import { format } from "date-fns";
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
import { dateKeyLocal, formatDate, relativeDayLabel } from "@/core/datetime";
import { cn } from "@/core/utils/cn";

export interface ScheduleDayOption {
  /** Calendar day key (yyyy-MM-dd) in browser-local time. */
  key: string;
  /** Human label rendered in the list, e.g. "17 Aug 2026 (Fri)". */
  label: string;
}

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  options: ScheduleDayOption[];
  placeholder?: string;
  disabled?: boolean;
}

type QuickRel = "YESTERDAY" | "TODAY" | "TOMORROW";

interface QuickRow {
  rel: QuickRel;
  key: string;
  label: string;
}

interface VisibleQuickRow extends QuickRow {
  tokens: string;
}

/**
 * Multi-select day picker for the schedule export. Empty selection means
 * "all festival days" — matches the generator's default and lets the user
 * omit the filter step entirely.
 *
 * Built on the `DateFilterCombobox` shell (Calendar icon, calendar search
 * tokens, Quick filters + Festival days groups), but every row is a
 * checkbox so the user can pick any subset of the festival range.
 *
 * The trigger uses a `div role="combobox"` (not a `<button>`) so the
 * inline clear-X can live alongside it without nesting buttons.
 */
export function ScheduleDaysMultiSelect({
  value,
  onChange,
  options,
  placeholder = "Select days",
  disabled,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const dayKeys = React.useMemo(() => options.map((o) => o.key), [options]);
  const selectedSet = React.useMemo(() => new Set(value), [value]);
  const allSelected = options.length > 0 && selectedSet.size === options.length;

  const { todayKey, yesterdayKey, tomorrowKey } = React.useMemo(() => {
    const now = new Date();
    return {
      todayKey: dateKeyLocal(now),
      yesterdayKey: dateKeyLocal(new Date(now.getTime() - 86_400_000)),
      tomorrowKey: dateKeyLocal(new Date(now.getTime() + 86_400_000)),
    };
  }, []);
  const optionKeySet = React.useMemo(() => new Set(dayKeys), [dayKeys]);

  const longLabel = React.useCallback((key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return formatDate(new Date(y, m - 1, d, 12, 0), { style: "long" });
  }, []);

  const toggle = (key: string) => {
    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(dayKeys.filter((k) => next.has(k)));
  };

  const selectAll = () => onChange(dayKeys);
  const clearAll = () => onChange([]);
  const toggleAll = () => (allSelected ? clearAll() : selectAll());

  const matchedQuickRel = React.useCallback(
    (key: string): QuickRel | null => {
      if (key === todayKey) return "TODAY";
      if (key === yesterdayKey) return "YESTERDAY";
      if (key === tomorrowKey) return "TOMORROW";
      return null;
    },
    [todayKey, yesterdayKey, tomorrowKey],
  );

  const triggerLabel = (() => {
    if (value.length === 0) return placeholder;
    if (allSelected) return `All ${options.length} days`;
    if (value.length === 1) {
      const single = value[0]!;
      const rel = matchedQuickRel(single);
      if (rel) return relativeDayLabel(rel);
      const opt = options.find((o) => o.key === single);
      return opt?.label ?? single;
    }
    return `${value.length} days selected`;
  })();

  // Build the visible quick-filter rows. Each row's tokens include the
  // relative label (`today`), the long label, and the yyyy-MM-dd key so
  // the CommandInput search can find `Today`, `2026-08-17`, etc.
  const visibleQuickRows: VisibleQuickRow[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const allCandidates: QuickRow[] = [
      {
        rel: "YESTERDAY",
        key: yesterdayKey,
        label: relativeDayLabel("YESTERDAY"),
      },
      { rel: "TODAY", key: todayKey, label: relativeDayLabel("TODAY") },
      {
        rel: "TOMORROW",
        key: tomorrowKey,
        label: relativeDayLabel("TOMORROW"),
      },
    ];
    const candidates = allCandidates.filter((r) => optionKeySet.has(r.key));

    return candidates
      .map((r) => ({
        ...r,
        tokens: [r.rel.toLowerCase(), r.label, r.key, longLabel(r.key)]
          .filter(Boolean)
          .join(" "),
      }))
      .filter((r) => {
        if (!q) return true;
        return (
          r.label.toLowerCase().includes(q) ||
          r.rel.toLowerCase().includes(q) ||
          r.tokens.toLowerCase().includes(q)
        );
      });
  }, [yesterdayKey, todayKey, tomorrowKey, optionKeySet, query, longLabel]);

  const visibleDayOptions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const rel = matchedQuickRel(o.key);
      const relLabel = rel ? relativeDayLabel(rel) : "";
      const label = longLabel(o.key);
      const tokens = [
        rel ? rel.toLowerCase() : "",
        relLabel,
        o.label,
        o.key,
        label,
        label,
      ]
        .filter(Boolean)
        .join(" ");
      return tokens.toLowerCase().includes(q);
    });
  }, [options, query, matchedQuickRel, longLabel]);

  const selectedOptions = options.filter((o) => selectedSet.has(o.key));
  const showEmptyState =
    visibleQuickRows.length === 0 && visibleDayOptions.length === 0;

  return (
    <div className="space-y-2">
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <div
            role="combobox"
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label="Select days to include"
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
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 font-normal",
              value.length === 0 && "text-muted-foreground",
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <Calendar className="h-4 w-4 shrink-0 opacity-50" />
              <span className="truncate">{triggerLabel}</span>
            </span>
            <div className="flex items-center shrink-0">
              {value.length > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    clearAll();
                  }}
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear day filter"
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
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search day…"
            />
            <CommandList className="max-h-72">
              {showEmptyState ? (
                <CommandEmpty>No day found.</CommandEmpty>
              ) : null}

              {visibleQuickRows.length > 0 ? (
                <CommandGroup heading="Quick filters">
                  {visibleQuickRows.map((r) => {
                    const checked = selectedSet.has(r.key);
                    return (
                      <CommandItem
                        key={r.rel}
                        value={r.tokens}
                        onSelect={() => toggle(r.key)}
                        className="flex items-center gap-3"
                      >
                        <Checkbox
                          checked={checked}
                          aria-label={`Include ${r.label}`}
                          className="pointer-events-none"
                        />
                        <span className="flex-1 truncate">{r.label}</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {r.key}
                        </span>
                      </CommandItem>
                    );
                  })}
                  <CommandItem
                    value="__all_days__"
                    onSelect={toggleAll}
                    className="flex items-center gap-3"
                  >
                    <Checkbox
                      checked={allSelected}
                      aria-label={
                        allSelected ? "Clear all days" : "Select all days"
                      }
                      className="pointer-events-none"
                    />
                    <span className="flex-1 truncate">
                      {allSelected ? "Clear all days" : "All days"}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {options.length}
                    </span>
                  </CommandItem>
                </CommandGroup>
              ) : null}

              {visibleDayOptions.length > 0 ? (
                <CommandGroup heading="Festival days">
                  {visibleDayOptions.map((o) => {
                    const checked = selectedSet.has(o.key);
                    const rel = matchedQuickRel(o.key);
                    const tokens = [
                      rel ? rel.toLowerCase() : "",
                      rel ? relativeDayLabel(rel) : "",
                      o.label,
                      o.key,
                      longLabel(o.key),
                      longLabel(o.key),
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <CommandItem
                        key={o.key}
                        value={tokens}
                        onSelect={() => toggle(o.key)}
                        className="flex items-center gap-3"
                      >
                        <Checkbox
                          checked={checked}
                          aria-label={`Include ${o.label}`}
                          className="pointer-events-none"
                        />
                        <span className="flex-1 truncate">
                          {o.label}
                          {rel ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({relativeDayLabel(rel)})
                            </span>
                          ) : null}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {o.key}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null}
            </CommandList>
            <div className="flex items-center justify-between border-t px-2 py-1.5">
              <button
                type="button"
                onClick={selectAll}
                disabled={allSelected || options.length === 0}
                className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Select all
              </button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {value.length}/{options.length}
              </span>
              <button
                type="button"
                onClick={clearAll}
                disabled={value.length === 0}
                className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((o) => (
            <span
              key={o.key}
              className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-xs font-medium"
            >
              <span className="truncate max-w-[12rem]">{o.label}</span>
              <button
                type="button"
                aria-label={`Remove ${o.label}`}
                onClick={() => toggle(o.key)}
                className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {/* Accessible live region for selection count. */}
      <span className="sr-only" aria-live="polite">
        {value.length} of {options.length} days selected
      </span>
    </div>
  );
}

/** Convenience: build the option list for a date range in browser-local time. */
export function buildScheduleDayOptions(
  startDate: string | null,
  endDate: string | null,
): ScheduleDayOption[] {
  if (!startDate || !endDate) return [];
  const startKey = format(new Date(startDate), "yyyy-MM-dd");
  const endKey = format(new Date(endDate), "yyyy-MM-dd");
  if (startKey > endKey) return [];

  const out: ScheduleDayOption[] = [];
  const [sy, sm, sd] = startKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  const cursor = new Date(sy, sm - 1, sd, 12, 0);
  const end = new Date(ey, em - 1, ed, 12, 0);
  while (cursor.getTime() <= end.getTime()) {
    const key = format(cursor, "yyyy-MM-dd");
    const label = formatDate(new Date(cursor), { style: "long" });
    out.push({ key, label });
    cursor.setDate(cursor.getDate() + 1);
    if (out.length > 60) break;
  }
  return out;
}
