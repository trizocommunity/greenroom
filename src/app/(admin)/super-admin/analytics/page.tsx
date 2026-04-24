import { AnalyticsCharts } from "@/components/super-admin/AnalyticsCharts";
import {
  getLoginCounts,
  getLoginsByDay,
  getPurchaseSummaries,
  getRevenueByDay,
  getTopCategories,
} from "@/features/admin/services/analytics.service";

export default async function SuperAdminAnalyticsPage() {
  const [purchases, logins, topCategories, loginsByDay, revenueByDay] =
    await Promise.all([
      getPurchaseSummaries(),
      getLoginCounts(),
      getTopCategories(10),
      getLoginsByDay(14),
      getRevenueByDay(14),
    ]);

  const initialData = {
    purchases: purchases.map((p) => ({
      ...p,
      lastPurchaseAt: p.lastPurchaseAt?.toISOString() ?? null,
    })),
    logins,
    topCategories,
    loginsByDay,
    revenueByDay: revenueByDay.map((p) => ({
      date: p.date,
      count: p.count,
      amount: p.amount ?? 0,
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          User Behaviour Analytics
        </h2>
        <p className="text-muted-foreground">
          Purchase history, login activity, and category preferences. Charts
          refresh every minute with live data.
        </p>
      </div>

      <AnalyticsCharts initialData={initialData} />
    </div>
  );
}
