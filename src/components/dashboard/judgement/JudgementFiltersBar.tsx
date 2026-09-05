"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateFilterCombobox } from "@/components/ui/date-filter-combobox";
import { Input } from "@/components/ui/input";

/**
 * The sticky row above the programme grid: search + date picker + a button
 * that opens the full FilterSheet for stage/category/type.
 *
 * Anything more advanced (stage / category / type) lives in the sheet so the
 * bar stays usable on tablet widths.
 */
export function JudgementFiltersBar({
  searchQuery,
  onSearchChange,
  filterDate,
  onFilterDateChange,
  scheduledDates,
  activeFilterCount,
  onOpenFilterSheet,
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  filterDate: Date[];
  onFilterDateChange: (v: Date[]) => void;
  scheduledDates: Array<{ key: string; label: string }>;
  activeFilterCount: number;
  onOpenFilterSheet: () => void;
}) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-3 lg:grid-cols-4 items-center gap-2 pb-5">
      <div className="col-span-4 sm:col-span-1 lg:col-span-2 relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search programmes..."
          className="h-10 pl-9 pr-9 bg-background"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="col-span-2 sm:col-span-1 min-w-[130px]">
        <DateFilterCombobox
          value={filterDate}
          onChange={onFilterDateChange}
          availableDates={scheduledDates}
          placeholder="All Dates"
          className="h-10 bg-background"
        />
      </div>

      <div className="col-span-1">
        <Button
          type="button"
          variant="outline"
          onClick={onOpenFilterSheet}
          className="h-10 shrink-0 gap-2 bg-background w-full"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filter</span>
          {activeFilterCount > 0 ? (
            <Badge
              variant="secondary"
              className="h-5 min-w-5 justify-center px-1 text-[10px]"
            >
              {activeFilterCount}
            </Badge>
          ) : null}
        </Button>
      </div>
    </div>
  );
}
