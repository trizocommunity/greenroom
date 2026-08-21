"use client";

import { Button } from "@/components/ui/button";
import { DateFilterCombobox } from "@/components/ui/date-filter-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ReportingFiltersState } from "./useReportingFilters";

/**
 * Stage + category + type + status + show-ended controls that don't fit in the
 * top bar. Each control owns its own onChange; the hook handles page-index
 * reset so this component stays declarative.
 */
export function ReportingFilterSheet({
  filters,
  hideStageFilter,
}: {
  filters: ReportingFiltersState;
  hideStageFilter: boolean;
}) {
  return (
    <Sheet open={filters.isFilterOpen} onOpenChange={filters.setIsFilterOpen}>
      <SheetContent className="gap-4">
        <SheetHeader className="text-left">
          <SheetTitle>Filter programmes</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Category
            </p>
            <Select
              value={filters.filterCategoryId}
              onValueChange={filters.setFilterCategoryId}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {filters.categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!hideStageFilter && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Stage</p>
              <Select
                value={filters.filterStageId}
                onValueChange={filters.setFilterStageId}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All stages</SelectItem>
                  {filters.stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Type</p>
            <Select
              value={filters.filterType}
              onValueChange={(v) =>
                filters.setFilterType(v as ReportingFiltersState["filterType"])
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="GROUP">Group</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Status</p>
            <Select
              value={filters.filterStatus}
              onValueChange={filters.setFilterStatus}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All status</SelectItem>
                <SelectItem value="NOT_STARTED">Not started</SelectItem>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                <SelectItem value="RESET">Reporting closed</SelectItem>
                <SelectItem value="CLOSED">Reporting ended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Schedule State
            </p>
            <Select
              value={filters.filterScheduleState}
              onValueChange={(v) =>
                filters.setFilterScheduleState(
                  v as ReportingFiltersState["filterScheduleState"],
                )
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Schedule state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All programmes</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled only</SelectItem>
                <SelectItem value="UNSCHEDULED">Unscheduled only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filters.filterScheduleState !== "UNSCHEDULED" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Date</p>
              <DateFilterCombobox
                value={filters.filterDate}
                onChange={filters.setFilterDate}
                availableDates={filters.scheduledDates}
                placeholder="All Dates"
                className="h-10"
              />
            </div>
          )}

          <label className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5">
            <span className="text-sm font-medium">Show ended sessions</span>
            <input
              type="checkbox"
              checked={filters.showEnded}
              onChange={(e) => filters.setShowEnded(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </label>
        </div>
        <SheetFooter className="flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={filters.resetAllFilters}
          >
            Reset
          </Button>
          <Button
            className="flex-1"
            onClick={() => filters.setIsFilterOpen(false)}
          >
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
