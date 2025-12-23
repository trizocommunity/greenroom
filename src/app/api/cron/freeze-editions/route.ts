import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { EditionLifecycleService } from "@/server/services/edition-lifecycle.service";

// CRON_SECRET should be set in environment variables
// If not set, it defaults to a known value for dev (but should be secure in prod)
// For Vercel Cron, this is automatically handled if you check authentication headers.
// Here we'll use a simple query param or header check for manual testing/cron.

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // strict check: if CRON_SECRET is set, require it.
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Also allow Vercel's signature or other methods if needed, but for now strict Bearer
      // fall back to query param for ease of triggering manually if secret is known
      const url = new URL(request.url);
      if (url.searchParams.get("key") !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();

    // Find candidates: ACTIVE editions where endDate < now
    const expiredEditions = await prisma.edition.findMany({
      where: {
        status: "ACTIVE",
        endDate: {
          lt: now,
        },
      },
    });

    const results = [];

    for (const edition of expiredEditions) {
      // Double check logic via service (source of truth)
      const updated = await EditionLifecycleService.evaluate(edition);
      if (updated.status !== "ACTIVE") {
        results.push({
          id: edition.id,
          oldStatus: "ACTIVE",
          newStatus: updated.status,
          slug: edition.slug,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: expiredEditions.length,
      frozen: results.length,
      details: results,
    });
  } catch (error: any) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
