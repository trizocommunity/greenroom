import { NextResponse } from "next/server";

/**
 * Placeholder endpoint for Socket.IO path ownership.
 * In the current Next.js deployment mode, SSE remains the default transport.
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message:
        "Socket transport is not enabled in this runtime. Use SSE fallback or enable custom server mode.",
    },
    { status: 501 },
  );
}
