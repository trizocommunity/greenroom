import { NextResponse } from "next/server";
import { FestivalExpirationService } from "@/features/festivals/services/festival-expiration.service";

/**
 * Cron Job: Festival lifecycle management (pre-archival + expiration)
 *
 * Step 1 — Pre-archival (runs daily):
 *   Finds festivals expiring within 5 days that are not yet EXPIRED.
 *   Snapshots results to expired_festival_result so data is preserved
 *   even if the expiration step fails or is delayed.
 *
 * Step 2 — Expiration (runs daily, after pre-archival):
 *   Finds festivals past expiresAt that are not yet EXPIRED.
 *   Deletes non-retained data and marks festival EXPIRED.
 *
 * Security: Validates CRON_SECRET if present in env.
 * Recommended frequency: Daily.
 */
export async function GET(request: Request) {
  try {
    if (process.env.NODE_ENV === "production" && !process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: "CRON_SECRET is required in production" },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("authorization");
    if (
      !process.env.CRON_SECRET ||
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preArchival = await FestivalExpirationService.runPreArchivalCycle();
    const expiration = await FestivalExpirationService.runExpirationCycle();

    return NextResponse.json({
      success: true,
      message: `Lifecycle cycle completed. Pre-archived: ${preArchival.processed}, Expired: ${expiration.processed}`,
      preArchived: preArchival.processed,
      expired: expiration.processed,
    });
  } catch (error: any) {
    console.error("[Cron] Lifecycle management failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
