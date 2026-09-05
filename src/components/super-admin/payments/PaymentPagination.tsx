"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

interface PaymentPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

export function PaymentPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
}: PaymentPaginationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isPending, startTransition] = useTransition();

  if (totalPages <= 1 && totalItems <= pageSize) {
    return null;
  }

  const navigateToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    startTransition(() => {
      replace(`${pathname}?${params.toString()}`);
    });
  };

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card/40">
      <div className="text-xs text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
        Showing <span className="font-medium text-foreground">{startItem}</span>{" "}
        to <span className="font-medium text-foreground">{endItem}</span> of{" "}
        <span className="font-medium text-foreground">{totalItems}</span>{" "}
        transactions
      </div>

      <div className="flex items-center gap-2 order-1 sm:order-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(currentPage - 1)}
          disabled={currentPage <= 1 || isPending}
          className="min-h-[40px] sm:min-h-[32px] px-3 gap-1 rounded-xl touch-manipulation"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs">Prev</span>
        </Button>

        <span className="text-xs font-mono font-medium px-2">
          {currentPage} / {Math.max(1, totalPages)}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(currentPage + 1)}
          disabled={currentPage >= totalPages || isPending}
          className="min-h-[40px] sm:min-h-[32px] px-3 gap-1 rounded-xl touch-manipulation"
        >
          <span className="text-xs">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
