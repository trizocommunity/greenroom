"use client";

import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { ReportingBoardList } from "./ReportingBoardList";
import { getUiReportingStatus } from "./reporting-status";
import type { ReportingBoardItem } from "./types";

/**
 * Wraps ReportingBoardList with pagination + the empty state. Owns the
 * "clicking a closed session opens the timer drawer" branch — that's a
 * queue-level UX rule, not a workspace one.
 */
export function ReportingQueue({
  items,
  selectedId,
  pageIndex,
  pageSize,
  assignmentCountByProgrammeId,
  mounted,
  hasActiveFilterOrSearch,
  onSelect,
  onPageChange,
}: {
  items: ReportingBoardItem[];
  selectedId: string | null;
  pageIndex: number;
  pageSize: number;
  assignmentCountByProgrammeId: Map<string, number>;
  mounted: boolean;
  hasActiveFilterOrSearch: boolean;
  onSelect: (id: string) => void;
  onPageChange: (page: number) => void;
}) {
  const pagedItems = items.slice(
    pageIndex * pageSize,
    (pageIndex + 1) * pageSize,
  );

  return (
    <div className="space-y-3">
      <ReportingBoardList
        items={pagedItems}
        selectedId={selectedId}
        onSelect={onSelect}
        getUiReportingStatus={(status, windowEndsAt) =>
          getUiReportingStatus(status, windowEndsAt, mounted)
        }
        assignmentCountByProgrammeId={assignmentCountByProgrammeId}
      />
      {!items.length ? (
        <div className="flex h-96 items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
          <p>
            {hasActiveFilterOrSearch
              ? "No programmes match your search or filters."
              : "No programmes to report yet."}
          </p>
        </div>
      ) : null}

      {items.length > pageSize && (
        <DataTablePagination
          pageIndex={pageIndex}
          pageCount={Math.ceil(items.length / pageSize)}
          onPageChange={onPageChange}
          className="mt-4"
        />
      )}
    </div>
  );
}
