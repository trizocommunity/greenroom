import { NextResponse } from "next/server";
import { realtimeConfig } from "@/lib/realtime-config";
import { dispatchRealtimeOutboxBatch } from "@/server/realtime/dispatcher.worker";
import { getRealtimeOutboxBacklogCount } from "@/server/realtime/outbox.service";

export async function GET(request: Request) {
  try {
    if (
      process.env.NODE_ENV === "production" &&
      realtimeConfig.requireCronSecretInProduction &&
      !process.env.CRON_SECRET
    ) {
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

    const dispatched = await dispatchRealtimeOutboxBatch();
    const pending = await getRealtimeOutboxBacklogCount("PENDING");
    const failed = await getRealtimeOutboxBacklogCount("FAILED");
    const processing = await getRealtimeOutboxBacklogCount("PROCESSING");

    return NextResponse.json({
      success: true,
      dispatched,
      pending,
      failed,
      processing,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
