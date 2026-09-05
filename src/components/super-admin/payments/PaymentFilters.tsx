"use client";

import { Download, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "Paid", value: "PAID" },
  { label: "Pending", value: "PENDING" },
  { label: "Failed", value: "FAILED" },
];

const TIER_OPTIONS = [
  { label: "All Plans", value: "ALL" },
  { label: "Basic (₹1,500)", value: "BASIC" },
  { label: "Standard (₹3,000)", value: "STANDARD" },
  { label: "Pro (₹6,000)", value: "PRO" },
];

export function PaymentFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [, startTransition] = useTransition();

  const currentQ = searchParams.get("q") || "";
  const currentStatus = searchParams.get("status") || "ALL";
  const currentTier = searchParams.get("tier") || "ALL";

  const [term, setTerm] = useState(currentQ);

  // Sync state if URL changes externally
  useEffect(() => {
    setTerm(currentQ);
  }, [currentQ]);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== "ALL") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      startTransition(() => {
        replace(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, replace],
  );

  // Debounced search input
  useEffect(() => {
    const handler = setTimeout(() => {
      if (term !== currentQ) {
        updateParams({ q: term || undefined, page: "1" });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [term, currentQ, updateParams]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (currentQ) params.set("q", currentQ);
    if (currentStatus && currentStatus !== "ALL")
      params.set("status", currentStatus);
    if (currentTier && currentTier !== "ALL") params.set("tier", currentTier);

    window.open(
      `/api/v1/super-admin/payments/export?${params.toString()}`,
      "_blank",
    );
  };

  return (
    <div className="space-y-3">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by customer, email, order or pay ID..."
            className="pl-9 pr-8 h-10 rounded-xl bg-card border-border text-sm"
          />
          {term && (
            <button
              type="button"
              onClick={() => {
                setTerm("");
                updateParams({ q: undefined, page: "1" });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tier Selector */}
        <div className="w-full sm:w-[180px]">
          <Select
            value={currentTier}
            onValueChange={(val) => updateParams({ tier: val, page: "1" })}
          >
            <SelectTrigger className="h-10 rounded-xl bg-card border-border text-sm">
              <SelectValue placeholder="Select Plan" />
            </SelectTrigger>
            <SelectContent>
              {TIER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Export CSV Button */}
        <Button
          variant="outline"
          onClick={handleExportCsv}
          className="h-10 rounded-xl border-border bg-card hover:bg-muted/50 gap-2 shrink-0 touch-manipulation"
          title="Export current filtered payments to CSV"
        >
          <Download className="w-4 h-4 text-muted-foreground" />
          <span className="hidden sm:inline text-xs font-medium">
            Export CSV
          </span>
          <span className="sm:hidden text-xs font-medium">Export</span>
        </Button>
      </div>

      {/* Horizontal Scrollable Status Tabs (Touch-friendly thumb-zone) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {STATUS_OPTIONS.map((status) => {
          const isActive = currentStatus === status.value;
          return (
            <button
              type="button"
              key={status.value}
              onClick={() => updateParams({ status: status.value, page: "1" })}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 touch-manipulation flex items-center gap-1.5 ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
              }`}
            >
              {status.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
