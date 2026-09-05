"use client";

import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { cn } from "@/core/utils/cn";
import { RejudgeProgrammeCard } from "./RejudgeProgrammeCard";
import { CalendarSearch, CompactSelect } from "./SectionFilterRow";
import type { Programme } from "./types";
import { REJUDGE_PAGE_SIZE } from "./types";
import type { JudgementFiltersState } from "./useJudgementFilters";

type RejudgeFiltersSlice = Pick<
  JudgementFiltersState,
  | "rejudgeSearchQuery"
  | "setRejudgeSearchQuery"
  | "rejudgeCategoryFilter"
  | "setRejudgeCategoryFilter"
  | "rejudgeJudgingModeFilter"
  | "setRejudgeJudgingModeFilter"
>;

export function RejudgeSection({
  programmes,
  pageIndex,
  onPageChange,
  onSelect,
  filters,
  rejudgeCategories,
  mobileTab,
}: {
  programmes: Programme[];
  pageIndex: number;
  onPageChange: (p: number) => void;
  onSelect: (programme: Programme) => void;
  filters: RejudgeFiltersSlice;
  rejudgeCategories: string[];
  mobileTab: "completed" | "rejudge";
}) {
  const showEmpty =
    programmes.length === 0 &&
    filters.rejudgeSearchQuery === "" &&
    filters.rejudgeCategoryFilter === "ALL" &&
    filters.rejudgeJudgingModeFilter === "ALL";

  return (
    <section
      className={cn("space-y-3", mobileTab !== "rejudge" && "hidden sm:block")}
    >
      <h2 className="text-base font-semibold tracking-tight sm:text-lg flex items-center justify-between">
        Rejudge
        <Badge variant="outline" className="text-[10px]">
          {programmes.length}
        </Badge>
      </h2>
      {showEmpty ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No judged programmes available for rejudge (published items never
          appear here).
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[150px]">
            <CalendarSearch
              value={filters.rejudgeSearchQuery}
              onChange={(v) => {
                filters.setRejudgeSearchQuery(v);
                onPageChange(0);
              }}
              placeholder="Search..."
            />
          </div>
          <CompactSelect
            value={filters.rejudgeCategoryFilter}
            onChange={(v) => {
              filters.setRejudgeCategoryFilter(v);
              onPageChange(0);
            }}
            options={rejudgeCategories}
            placeholder="All cats"
            showNone
          />
          <CompactSelect
            value={filters.rejudgeJudgingModeFilter}
            onChange={(v) => {
              filters.setRejudgeJudgingModeFilter(v);
              onPageChange(0);
            }}
            options={["SINGLE", "GROUP"]}
            placeholder="All modes"
            widthClass="w-[100px]"
          />
        </div>
      )}
      {!showEmpty ? (
        programmes.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No rejudge programmes match filters.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {programmes
                .slice(
                  pageIndex * REJUDGE_PAGE_SIZE,
                  (pageIndex + 1) * REJUDGE_PAGE_SIZE,
                )
                .map((p) => (
                  <RejudgeProgrammeCard
                    key={p.id}
                    programme={p}
                    onClick={() => onSelect(p)}
                  />
                ))}
            </div>
            {programmes.length > REJUDGE_PAGE_SIZE && (
              <DataTablePagination
                pageIndex={pageIndex}
                pageCount={Math.ceil(programmes.length / REJUDGE_PAGE_SIZE)}
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
