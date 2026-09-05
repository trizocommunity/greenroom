import { CreditCard, History } from "lucide-react";
import { Suspense } from "react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { PaymentCardMobile } from "@/components/super-admin/payments/PaymentCardMobile";
import { PaymentFilters } from "@/components/super-admin/payments/PaymentFilters";
import { PaymentMetricsCards } from "@/components/super-admin/payments/PaymentMetricsCards";
import { PaymentPagination } from "@/components/super-admin/payments/PaymentPagination";
import { PaymentTableDesktop } from "@/components/super-admin/payments/PaymentTableDesktop";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { adminService } from "@/features/admin/services/admin.service";

interface AdminPaymentsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    tier?: string;
    page?: string;
  }>;
}

export default async function AdminPaymentsPage({
  searchParams,
}: AdminPaymentsPageProps) {
  const { q, status, tier, page } = await searchParams;
  const currentPage = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
  const pageSize = 20;

  const { items, pagination, metrics } =
    await adminService.getPaymentsWithMetricsForAdmin({
      q,
      status,
      tier,
      page: currentPage,
      pageSize,
    });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* 1. Header Section */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Payments
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
          Platform financial transactions, revenue metrics, and gateway
          settlement logs
        </p>
      </div>

      {/* 2. Platform-wide Financial KPI Metrics */}
      <PaymentMetricsCards metrics={metrics} />

      {/* 3. Search & Filter Controls Toolbar */}
      <Suspense fallback={null}>
        <PaymentFilters />
      </Suspense>

      {/* 4. Transactions List Card */}
      <Card className="rounded-2xl border-border shadow-premium overflow-hidden bg-card">
        <CardHeader className="border-b border-border py-4 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <History className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold tracking-tight">
                  Transaction Records
                </CardTitle>
                <CardDescription className="text-xs">
                  {pagination.total === 0
                    ? "No records found"
                    : `Showing ${items.length} of ${pagination.total} platform logs`}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {items.length === 0 ? (
            <AdminEmptyState
              icon={<CreditCard className="h-8 w-8 text-primary" />}
              title="No transactions found"
              description={
                q || status || tier
                  ? "No payments match your selected search or filter criteria. Try adjusting your filters."
                  : "Your financial logs are currently empty. Transactions will automatically appear here as users purchase plans."
              }
            />
          ) : (
            <>
              {/* Mobile View: High-contrast touch-friendly cards (<md) */}
              <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
                {items.map((payment) => (
                  <PaymentCardMobile key={payment.id} payment={payment} />
                ))}
              </div>

              {/* Desktop View: Comprehensive Data Table (>=md) */}
              <PaymentTableDesktop payments={items} />

              {/* Pagination */}
              <Suspense fallback={null}>
                <PaymentPagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.total}
                  pageSize={pagination.pageSize}
                />
              </Suspense>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
