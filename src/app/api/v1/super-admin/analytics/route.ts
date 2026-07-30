import "server-only";

import { createAdminHandler, ok } from "@/api/lib";
import {
  getLoginCounts,
  getLoginsByDay,
  getPurchaseSummaries,
  getRevenueByDay,
  getTopCategories,
} from "@/features/admin/services/analytics.service";

const handler = createAdminHandler({
  async GET() {
    const [purchases, logins, topCategories, loginsByDay, revenueByDay] =
      await Promise.all([
        getPurchaseSummaries(),
        getLoginCounts(),
        getTopCategories(10),
        getLoginsByDay(14),
        getRevenueByDay(14),
      ]);

    return ok(
      {
        purchases,
        logins,
        topCategories,
        loginsByDay,
        revenueByDay,
      },
      "private, max-age=10",
    );
  },
});

export const GET = handler;
