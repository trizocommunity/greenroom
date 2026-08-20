"use client";

import { format } from "date-fns";
import { useCallback, useState } from "react";
import { parseInstant } from "@/core/datetime";
import type { Programme, ReportingDetails } from "./types";

export type ScheduleStateFilter = "ALL" | "SCHEDULED" | "UNSCHEDULED";

export interface JudgementFiltersState {
  // top-bar state (search + schedule + date)
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterScheduleState: ScheduleStateFilter;
  setFilterScheduleState: (v: ScheduleStateFilter) => void;
  filterDate: Date | undefined;
  setFilterDate: (v: Date | undefined) => void;

  // drawer state (stage + category + type)
  selectedStageId: string;
  setSelectedStageId: (v: string) => void;
  effectiveStageId: string;
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  filterType: string;
  setFilterType: (v: string) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (v: boolean) => void;
  activeFilterCount: number;
  resetDrawerFilters: () => void;

  // completed section state
  completedSearchQuery: string;
  setCompletedSearchQuery: (v: string) => void;
  completedCategoryFilter: string;
  setCompletedCategoryFilter: (v: string) => void;
  completedJudgingModeFilter: string;
  setCompletedJudgingModeFilter: (v: string) => void;

  // rejudge section state
  rejudgeSearchQuery: string;
  setRejudgeSearchQuery: (v: string) => void;
  rejudgeCategoryFilter: string;
  setRejudgeCategoryFilter: (v: string) => void;
  rejudgeJudgingModeFilter: string;
  setRejudgeJudgingModeFilter: (v: string) => void;

  // predicate helpers (built from the state above)
  matchesStageFilter: (stageId: string | null | undefined) => boolean;
  matchesScheduleAndDate: (
    details: ReportingDetails | null | undefined,
  ) => boolean;
}

/**
 * Holds every filter input for the judgement dashboard. Components read state
 * via the returned object; pure filtering lives in `judgementFilters` below.
 */
export function useJudgementFilters({
  stages = [],
  initialStageId = null,
  hideStageFilter = false,
}: {
  stages?: Array<{ id: string; name: string }>;
  initialStageId?: string | null;
  hideStageFilter?: boolean;
}): JudgementFiltersState {
  const autoLockedStageId =
    hideStageFilter && stages.length === 1 ? stages[0]!.id : null;
  const [selectedStageId, setSelectedStageId] = useState<string>(
    autoLockedStageId ?? initialStageId ?? "",
  );
  const effectiveStageId = autoLockedStageId ?? selectedStageId;

  const [filterScheduleState, setFilterScheduleState] =
    useState<ScheduleStateFilter>("SCHEDULED");
  const [filterDate, setFilterDate] = useState<Date | undefined>(new Date());

  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [completedSearchQuery, setCompletedSearchQuery] = useState("");
  const [completedCategoryFilter, setCompletedCategoryFilter] =
    useState<string>("ALL");
  const [completedJudgingModeFilter, setCompletedJudgingModeFilter] =
    useState<string>("ALL");
  const [rejudgeSearchQuery, setRejudgeSearchQuery] = useState("");
  const [rejudgeCategoryFilter, setRejudgeCategoryFilter] =
    useState<string>("ALL");
  const [rejudgeJudgingModeFilter, setRejudgeJudgingModeFilter] =
    useState<string>("ALL");

  const activeFilterCount =
    (selectedStageId !== "" && selectedStageId !== "__all__" ? 1 : 0) +
    (filterCategory !== "ALL" ? 1 : 0) +
    (filterType !== "ALL" ? 1 : 0);

  const matchesStageFilter = useCallback(
    (stageId: string | null | undefined) =>
      effectiveStageId === "" || stageId === effectiveStageId,
    [effectiveStageId],
  );

  const matchesScheduleAndDate = useCallback(
    (details: ReportingDetails | null | undefined) => {
      if (filterScheduleState === "SCHEDULED" && !details?.scheduleStart)
        return false;
      if (filterScheduleState === "UNSCHEDULED" && details?.scheduleStart)
        return false;

      if (filterDate && details?.scheduleStart) {
        const d = parseInstant(details.scheduleStart);
        if (d) {
          const key = format(d, "yyyy-MM-dd");
          const targetDate = format(filterDate, "yyyy-MM-dd");
          if (key !== targetDate) return false;
        }
      }
      return true;
    },
    [filterScheduleState, filterDate],
  );

  return {
    searchQuery,
    setSearchQuery,
    filterScheduleState,
    setFilterScheduleState,
    filterDate,
    setFilterDate,
    selectedStageId,
    setSelectedStageId,
    effectiveStageId,
    filterCategory,
    setFilterCategory,
    filterType,
    setFilterType,
    isFilterOpen,
    setIsFilterOpen,
    activeFilterCount,
    resetDrawerFilters: () => {
      setSelectedStageId("");
      setFilterCategory("ALL");
      setFilterType("ALL");
    },
    completedSearchQuery,
    setCompletedSearchQuery,
    completedCategoryFilter,
    setCompletedCategoryFilter,
    completedJudgingModeFilter,
    setCompletedJudgingModeFilter,
    rejudgeSearchQuery,
    setRejudgeSearchQuery,
    rejudgeCategoryFilter,
    setRejudgeCategoryFilter,
    rejudgeJudgingModeFilter,
    setRejudgeJudgingModeFilter,
    matchesStageFilter,
    matchesScheduleAndDate,
  };
}

/**
 * Pure filter helpers — easier to test and reason about than the closure-bound
 * versions. Components build predicates by passing the matching functions from
 * `useJudgementFilters` along with their current string inputs.
 */
export const judgementFilters = {
  matchesSearch(
    haystack: string,
    category: string | null | undefined,
    query: string,
  ): boolean {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      haystack.toLowerCase().includes(q) ||
      (category?.toLowerCase().includes(q) ?? false)
    );
  },

  filterCategoryMatches(
    programmeCategory: string | null | undefined,
    filter: string,
  ): boolean {
    if (filter === "ALL") return true;
    if (filter === "NONE") return !programmeCategory;
    return programmeCategory === filter;
  },

  filterProgrammes(
    programmes: Programme[],
    args: {
      search: string;
      filterType: string;
      filterCategory: string;
      matchesStageFilter: (stageId: string | null | undefined) => boolean;
      matchesScheduleAndDate: (
        details: ReportingDetails | null | undefined,
      ) => boolean;
    },
  ): Programme[] {
    return programmes.filter((p) => {
      if (!args.matchesStageFilter(p.reportingDetails?.stageId ?? null))
        return false;
      if (!args.matchesScheduleAndDate(p.reportingDetails)) return false;
      if (
        !judgementFilters.matchesSearch(
          p.name,
          p.programmeCategory,
          args.search,
        )
      )
        return false;
      if (args.filterType !== "ALL" && p.programmeType !== args.filterType)
        return false;
      if (
        !judgementFilters.filterCategoryMatches(
          p.programmeCategory,
          args.filterCategory,
        )
      )
        return false;
      return true;
    });
  },
};
