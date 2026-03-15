import { NextResponse } from "next/server";
import { FestivalExpirationService } from "@/server/services/festival-expiration.service";

/**
 * Cron Job: Expire Festivals (fixed 30-day validity; no read-only)
 * Runs expiration process: snapshot results, delete non-retained data, set EXPIRED.
 * Frequency: Daily (recommended)
 * Security: Validates CRON_SECRET if present in env
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { processed } =
      await FestivalExpirationService.runExpirationCycle();

    return NextResponse.json({
      success: true,
      message: `Expiration cycle completed. Processed ${processed} festival(s).`,
      processed,
    });
  } catch (error: any) {
    console.error("[Cron] Expiration failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
