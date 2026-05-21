import { NextResponse } from "next/server";
import { FestivalExpirationService } from "@/features/festivals/services/festival-expiration.service";

const ALLOWED_CRON_IPS = ["35.92.0.0/14", "35.93.0.0/15", "3.64.0.0/13"];

function isAllowedCronIP(ip: string | null): boolean {
  if (!ip) return false;
  return ALLOWED_CRON_IPS.some((range) => {
    const [base, bits] = range.split("/");
    const mask = ~((1 << (32 - parseInt(bits, 10))) - 1);
    const ipNum =
      ip.split(".").reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>>
      0;
    const baseNum =
      base
        .split(".")
        .reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
    return (ipNum & mask) === (baseNum & mask);
  });
}

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
 * Security: Validates CRON_SECRET if present in env, and restricts to Vercel cron IPs.
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

    const clientIP =
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      null;
    const vercelCronHeader = request.headers.get("x-vercel-signature");

    if (process.env.NODE_ENV === "production") {
      if (
        vercelCronHeader !== process.env.CRON_SECRET &&
        !isAllowedCronIP(clientIP)
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
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
