"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { parseInstant } from "@/core/datetime";
import { getUiReportingStatus } from "./reporting-status";
import type { ReportingBoardItem } from "./types";

export type ScheduleStateFilter = "ALL" | "SCHEDULED" | "UNSCHEDULED";
export type ReportingTypeFilter = "ALL" | "INDIVIDUAL" | "GROUP";

export const PAGE_SIZE = 12;

export interface UseReportingFiltersArgs {
  board: ReportingBoardItem[];
  festivalStages: Array<{ id: string; name: string }>;
  initialStageId?: string | null;
}

export interface ReportingFiltersState {
  // top-bar state
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterScheduleState: ScheduleStateFilter;
  setFilterScheduleState: (v: ScheduleStateFilter) => void;
  filterDate: Date | undefined;
  setFilterDate: (v: Date | undefined) => void;

  // drawer state
  filterCategoryId: string;
  setFilterCategoryId: (v: string) => void;
  filterStageId: string;
  setFilterStageId: (v: string) => void;
  filterType: ReportingTypeFilter;
  setFilterType: (v: ReportingTypeFilter) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  showEnded: boolean;
  setShowEnded: (v: boolean) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (v: boolean) => void;

  // pagination
  pageIndex: number;
  setPageIndex: (v: number) => void;
  pageSize: number;

  // derived lists for filter sheet
  categories: Array<{ id: string; name: string }>;
  stages: Array<{ id: string; name: string }>;
  scheduledDates: Array<{ key: string; label: string }>;

  // counters + reset
  activeFilterCount: number;
  resetAllFilters: () => void;
}

/**
 * Holds every filter input for the programme-reporting queue. Pagination is
 * co-located here so every setter can reset the page to 0 atomically.
 */
export function useReportingFilters({
  board,
  festivalStages,
  initialStageId,
}: UseReportingFiltersArgs): ReportingFiltersState {
  const [filterCategoryId, setFilterCategoryId] = useState<string>("ALL");
  const [filterStageId, setFilterStageId] = useState<string>(
    initialStageId ?? "ALL",
  );
  const [filterType, setFilterType] = useState<ReportingTypeFilter>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterScheduleState, setFilterScheduleState] =
    useState<ScheduleStateFilter>("SCHEDULED");
  const [filterDate, setFilterDate] = useState<Date | undefined>(new Date());
  const [showEnded, setShowEnded] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of board) {
      const c = item.programme?.category;
      if (c?.id) map.set(c.id, c.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [board]);

  const stages = useMemo(() => {
    if (festivalStages.length > 0) return festivalStages;
    const map = new Map<string, string>();
    for (const item of board) {
      if (item.stage?.id) map.set(item.stage.id, item.stage.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [board, festivalStages]);

  const scheduledDates = useMemo(() => {
    const datesMap = new Map<string, string>();
    for (const item of board) {
      if (item.startTime) {
        const d = parseInstant(item.startTime);
        if (d) {
          const key = format(d, "yyyy-MM-dd");
          const label = format(d, "EEE, MMM d, yyyy");
          datesMap.set(key, label);
        }
      }
    }
    return Array.from(datesMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, label]) => ({ key, label }));
  }, [board]);

  const activeFilterCount =
    (filterCategoryId !== "ALL" ? 1 : 0) +
    (filterStageId !== "ALL" ? 1 : 0) +
    (filterType !== "ALL" ? 1 : 0) +
    (filterStatus !== "ALL" ? 1 : 0) +
    (showEnded ? 1 : 0) +
    (filterDate !== undefined ? 1 : 0);

  const resetAllFilters = () => {
    setFilterCategoryId("ALL");
    setFilterStageId(initialStageId ?? "ALL");
    setFilterType("ALL");
    setFilterStatus("ALL");
    setFilterScheduleState("ALL");
    setFilterDate(undefined);
    setShowEnded(false);
    setPageIndex(0);
  };

  // Each filter setter that may shrink the visible board resets the page
  // cursor back to the first page so callers don't need to remember.
  const setSearchQueryReset = (v: string) => {
    setSearchQuery(v);
    setPageIndex(0);
  };
  const setFilterScheduleStateReset = (v: ScheduleStateFilter) => {
    setFilterScheduleState(v);
    setPageIndex(0);
  };
  const setFilterDateReset = (v: Date | undefined) => {
    setFilterDate(v);
    setPageIndex(0);
  };
  const setFilterCategoryIdReset = (v: string) => {
    setFilterCategoryId(v);
    setPageIndex(0);
  };
  const setFilterStageIdReset = (v: string) => {
    setFilterStageId(v);
    setPageIndex(0);
  };
  const setFilterTypeReset = (v: ReportingTypeFilter) => {
    setFilterType(v);
    setPageIndex(0);
  };
  const setFilterStatusReset = (v: string) => {
    setFilterStatus(v);
    setPageIndex(0);
  };

  return {
    searchQuery,
    setSearchQuery: setSearchQueryReset,
    filterScheduleState,
    setFilterScheduleState: setFilterScheduleStateReset,
    filterDate,
    setFilterDate: setFilterDateReset,
    filterCategoryId,
    setFilterCategoryId: setFilterCategoryIdReset,
    filterStageId,
    setFilterStageId: setFilterStageIdReset,
    filterType,
    setFilterType: setFilterTypeReset,
    filterStatus,
    setFilterStatus: setFilterStatusReset,
    showEnded,
    setShowEnded,
    isFilterOpen,
    setIsFilterOpen,
    pageIndex,
    setPageIndex,
    pageSize: PAGE_SIZE,
    categories,
    stages,
    scheduledDates,
    activeFilterCount,
    resetAllFilters,
  };
}

/** Pure predicate — caller passes mounted so status can flip on the client. */
export function matchesReportingFilters(
  item: ReportingBoardItem,
  filters: {
    filterStatus: string;
    filterCategoryId: string;
    filterStageId: string;
    filterType: string;
    filterScheduleState: ScheduleStateFilter;
    filterDate: Date | undefined;
    searchQuery: string;
    mounted: boolean;
  },
): boolean {
  const status = getUiReportingStatus(
    item.reportingSession?.status,
    item.reportingSession?.windowEndsAt ?? null,
    filters.mounted,
  );
  if (filters.filterStatus !== "ALL" && status !== filters.filterStatus)
    return false;
  if (
    filters.filterCategoryId !== "ALL" &&
    item.programme?.category?.id !== filters.filterCategoryId
  )
    return false;
  if (
    filters.filterStageId !== "ALL" &&
    item.stage?.id !== filters.filterStageId
  )
    return false;
  if (
    filters.filterType !== "ALL" &&
    item.programme?.type !== filters.filterType
  )
    return false;

  if (filters.filterScheduleState === "SCHEDULED" && !item.scheduleEntry)
    return false;
  if (filters.filterScheduleState === "UNSCHEDULED" && item.scheduleEntry)
    return false;

  if (filters.filterDate && filters.filterScheduleState !== "UNSCHEDULED") {
    if (!item.startTime) return false;
    const d = parseInstant(item.startTime);
    if (!d) return false;
    const key = format(d, "yyyy-MM-dd");
    const targetDate = format(filters.filterDate, "yyyy-MM-dd");
    if (key !== targetDate) return false;
  }
  const query = filters.searchQuery.trim().toLowerCase();
  if (query) {
    const haystack = [
      item.programme?.name,
      item.programme?.category?.name,
      item.stage?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}
