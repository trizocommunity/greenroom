import { NextResponse } from "next/server";
import { FestivalLifecycleService } from "@/server/services/festival-lifecycle.service";

/**
 * Cron Job: Cleanup Expired Festivals
 * Frequency: Daily (recommended)
 * Security: Validates CRON_SECRET if present in env
 */
export async function GET(request: Request) {
  try {
    // 1. Authorization
    // Vercel Cron automatically adds this header.
    // If you are running strictly locally or without Vercel Cron, you can bypass this or use a manual secret.
    // For safety, we check if CRON_SECRET is defined in ENV.
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Execute Cleanup
    const deletedCount =
      await FestivalLifecycleService.cleanupExpiredFestivals();

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Deleted ${deletedCount} expired festivals.`,
      deletedCount,
    });
  } catch (error: any) {
    console.error("[Cron] Cleanup failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
