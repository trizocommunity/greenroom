"use client";

import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { cn } from "@/core/utils/cn";
import { CompletedJudgementItem } from "./CompletedJudgementItem";
import { CalendarSearch, CompactSelect } from "./SectionFilterRow";
import type { JudgedProgrammeCard } from "./types";
import { PAGE_SIZE } from "./types";
import type { JudgementFiltersState } from "./useJudgementFilters";

type CompletedFiltersSlice = Pick<
  JudgementFiltersState,
  | "completedSearchQuery"
  | "setCompletedSearchQuery"
  | "completedCategoryFilter"
  | "setCompletedCategoryFilter"
  | "completedJudgingModeFilter"
  | "setCompletedJudgingModeFilter"
>;

export function CompletedJudgementsSection({
  completedJudgements,
  pageIndex,
  onPageChange,
  formatCardDateTime,
  onSelect,
  filters,
  completedCategories,
  mobileTab,
}: {
  completedJudgements: JudgedProgrammeCard[];
  pageIndex: number;
  onPageChange: (p: number) => void;
  formatCardDateTime: (v: string | Date) => string;
  onSelect: (item: JudgedProgrammeCard) => void;
  filters: CompletedFiltersSlice;
  completedCategories: string[];
  mobileTab: "completed" | "rejudge";
}) {
  const showEmpty =
    completedJudgements.length === 0 &&
    filters.completedSearchQuery === "" &&
    filters.completedCategoryFilter === "ALL" &&
    filters.completedJudgingModeFilter === "ALL";

  return (
    <section
      className={cn(
        "space-y-3",
        mobileTab !== "completed" && "hidden sm:block",
      )}
    >
      <h2 className="text-base font-semibold tracking-tight sm:text-lg flex items-center justify-between">
        Completed judgements
        <Badge variant="outline" className="text-[10px]">
          {completedJudgements.length}
        </Badge>
      </h2>
      {showEmpty ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No completed judgements yet.
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[150px]">
            <CalendarSearch
              value={filters.completedSearchQuery}
              onChange={(v) => {
                filters.setCompletedSearchQuery(v);
                onPageChange(0);
              }}
              placeholder="Search..."
            />
          </div>
          <CompactSelect
            value={filters.completedCategoryFilter}
            onChange={(v) => {
              filters.setCompletedCategoryFilter(v);
              onPageChange(0);
            }}
            options={completedCategories}
            placeholder="All cats"
          />
          <CompactSelect
            value={filters.completedJudgingModeFilter}
            onChange={(v) => {
              filters.setCompletedJudgingModeFilter(v);
              onPageChange(0);
            }}
            options={["SINGLE", "GROUP"]}
            placeholder="All modes"
            widthClass="w-[100px]"
          />
        </div>
      )}
      {!showEmpty ? (
        completedJudgements.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No judgements match filters.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {completedJudgements
                .slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)
                .map((item) => (
                  <CompletedJudgementItem
                    key={item.configId}
                    item={item}
                    formatCardDateTime={formatCardDateTime}
                    onClick={() => onSelect(item)}
                  />
                ))}
            </div>
            {completedJudgements.length > PAGE_SIZE && (
              <DataTablePagination
                pageIndex={pageIndex}
                pageCount={Math.ceil(completedJudgements.length / PAGE_SIZE)}
                onPageChange={onPageChange}
                className="mt-6"
              />
            )}
          </>
        )
      ) : null}
    </section>
  );
}
