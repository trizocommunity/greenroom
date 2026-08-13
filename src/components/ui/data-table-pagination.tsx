import type { Table } from "@tanstack/react-table";
import * as React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface DataTablePaginationProps<TData> {
  table?: Table<TData>;
  // For manual pagination when not using react-table:
  pageIndex?: number;
  pageCount?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function DataTablePagination<TData>({
  table,
  pageIndex: manualPageIndex,
  pageCount: manualPageCount,
  onPageChange,
  className,
}: DataTablePaginationProps<TData>) {
  const pageIndex = table
    ? table.getState().pagination.pageIndex
    : (manualPageIndex ?? 0);
  const pageCount = table ? table.getPageCount() : (manualPageCount ?? 1);

  const setPage = (page: number) => {
    if (table) {
      table.setPageIndex(page);
    } else if (onPageChange) {
      onPageChange(page);
    }
  };

  const getCanPreviousPage = () => pageIndex > 0;
  const getCanNextPage = () => pageIndex < pageCount - 1;

  if (pageCount <= 1) return null;

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationFirst
            onClick={(e) => {
              e.preventDefault();
              setPage(0);
            }}
            className={
              !getCanPreviousPage()
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationPrevious
            onClick={(e) => {
              e.preventDefault();
              if (getCanPreviousPage()) setPage(pageIndex - 1);
            }}
            className={
              !getCanPreviousPage()
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>

        {[...Array(pageCount)].map((_, i) => {
          const targetPage = i;

          if (
            targetPage === 0 ||
            targetPage === pageCount - 1 ||
            (targetPage >= pageIndex - 1 && targetPage <= pageIndex + 1)
          ) {
            return (
              <PaginationItem key={i}>
                <PaginationLink
                  isActive={pageIndex === targetPage}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(targetPage);
                  }}
                  className="cursor-pointer"
                >
                  {targetPage + 1}
                </PaginationLink>
              </PaginationItem>
            );
          }

          if (targetPage === pageIndex - 2 || targetPage === pageIndex + 2) {
            return (
              <PaginationItem key={i}>
                <PaginationEllipsis />
              </PaginationItem>
            );
          }

          return null;
        })}

        <PaginationItem>
          <PaginationNext
            onClick={(e) => {
              e.preventDefault();
              if (getCanNextPage()) setPage(pageIndex + 1);
            }}
            className={
              !getCanNextPage()
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationLast
            onClick={(e) => {
              e.preventDefault();
              setPage(pageCount - 1);
            }}
            className={
              !getCanNextPage()
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
