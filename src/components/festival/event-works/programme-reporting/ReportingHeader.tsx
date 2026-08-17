"use client";

import { Calendar, Search, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReportingFiltersState } from "./useReportingFilters";

/**
 * Top-bar row above the queue: search + schedule filter + date picker + a
 * button that opens the full filter sheet for the deeper category/stage/type
 * controls. Anything that needs more screen real estate lives in the sheet so
 * the bar stays usable on tablet widths.
 */
export function ReportingHeader({
  filters,
  onOpenFilterSheet,
}: {
  filters: ReportingFiltersState;
  onOpenFilterSheet: () => void;
}) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 items-center gap-2 pb-5">
      <div className="col-span-4 md:col-span-2 lg:col-span-3 xl:col-span-5 relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.searchQuery}
          onChange={(e) => filters.setSearchQuery(e.target.value)}
          placeholder="Search programmes…"
          className="h-10 pl-9 pr-9"
        />
        {filters.searchQuery ? (
          <button
            type="button"
            onClick={() => filters.setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="md:col-span-2 xl:col-span-1">
        <Select
          value={filters.filterScheduleState}
          onValueChange={(v) =>
            filters.setFilterScheduleState(
              v as ReportingFiltersState["filterScheduleState"],
            )
          }
        >
          <SelectTrigger className="h-10 text-xs sm:text-sm">
            <Calendar className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Schedule Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Schedules</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="UNSCHEDULED">Unscheduled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-2 md:col-span-2 xl:col-span-1 shrink-0">
        <DatePicker
          date={filters.filterDate}
          onChange={filters.setFilterDate}
          placeholder="All Dates"
          className="h-10 text-xs sm:text-sm"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onOpenFilterSheet}
        className="h-10 shrink-0 md:col-span-2 lg:col-span-1 gap-2"
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="hidden sm:inline">Filter</span>
        {filters.activeFilterCount > 0 ? (
          <Badge
            variant="secondary"
            className="h-5 min-w-5 justify-center px-1 text-[10px]"
          >
            {filters.activeFilterCount}
          </Badge>
        ) : null}
      </Button>
    </div>
  );
}
