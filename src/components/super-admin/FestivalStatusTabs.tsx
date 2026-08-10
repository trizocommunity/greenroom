"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/core/utils/cn";

export function FestivalStatusTabs() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");

  return (
    <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-full sm:w-fit">
      <Link
        href="/super-admin/festivals"
        className={cn(
          "flex-1 sm:flex-none text-center px-4 py-2 rounded-md text-sm font-medium transition-colors",
          !statusFilter
            ? "bg-background shadow text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        All
      </Link>
      <Link
        href="/super-admin/festivals?status=EXPIRED"
        className={cn(
          "flex-1 sm:flex-none text-center px-4 py-2 rounded-md text-sm font-medium transition-colors",
          statusFilter === "EXPIRED"
            ? "bg-background shadow text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Expired
      </Link>
    </div>
  );
}
