import { NextResponse } from "next/server";
import { getSession } from "@/core/auth/session";
import {
  getLoginCounts,
  getLoginsByDay,
  getPurchaseSummaries,
  getRevenueByDay,
  getTopCategories,
} from "@/features/admin/services/analytics.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [purchases, logins, topCategories, loginsByDay, revenueByDay] =
      await Promise.all([
        getPurchaseSummaries(),
        getLoginCounts(),
        getTopCategories(10),
        getLoginsByDay(14),
        getRevenueByDay(14),
      ]);

    return NextResponse.json({
      purchases,
      logins,
      topCategories,
      loginsByDay,
      revenueByDay,
    });
  } catch (error) {
    console.error("Super Admin analytics API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
