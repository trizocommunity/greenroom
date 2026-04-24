import { NextResponse } from "next/server";
import { db, pool } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * Database health check endpoint
 * Returns database connection status and basic metrics
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Test Drizzle connection with a simple query
    await db.execute(sql`SELECT 1`);

    // Get pool stats
    const poolStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "healthy",
        database: "connected",
        responseTime: `${responseTime}ms`,
        pool: poolStats,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        responseTime: `${responseTime}ms`,
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : "Database connection failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
