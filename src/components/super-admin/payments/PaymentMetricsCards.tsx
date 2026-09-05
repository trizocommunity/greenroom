import { CheckCircle2, Clock, IndianRupee, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PaymentMetrics } from "@/features/admin/services/admin.service";

interface PaymentMetricsCardsProps {
  metrics: PaymentMetrics;
}

export function PaymentMetricsCards({ metrics }: PaymentMetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total Lifetime Revenue */}
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Revenue
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
              ₹{metrics.totalRevenue.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate">
              {metrics.paidCount} paid transactions
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Successful / Paid Count */}
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Successful
            </span>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
              {metrics.paidCount}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate">
              Fulfilled platform credits
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Pending Volume */}
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pending Volume
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
              {metrics.pendingCount}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate">
              {metrics.pendingCount > 0
                ? `₹${metrics.pendingAmount.toLocaleString("en-IN")} awaiting gateway`
                : "No pending checkouts"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 4. Tier Breakdown */}
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Plan Breakdown
            </span>
            <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold flex items-center gap-2 flex-wrap text-foreground">
              <span className="bg-muted/80 px-2 py-0.5 rounded text-xs font-mono">
                Basic: {metrics.tierCounts.BASIC}
              </span>
              <span className="bg-muted/80 px-2 py-0.5 rounded text-xs font-mono">
                Pro: {metrics.tierCounts.PRO}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate">
              Standard: {metrics.tierCounts.STANDARD}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
