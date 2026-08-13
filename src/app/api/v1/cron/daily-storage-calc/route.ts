import "server-only";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/core/database/client";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // This query sums the pg_column_size of rows from major tables linked to each festival
    // Note: Adjust table/column names if schema mappings differ.
    // Drizzle default is camelCase without quotes in mapping, but in raw SQL we must quote mixed-case columns.
    await db.execute(sql`
      WITH db_sizes AS (
        SELECT 
          f.id as festival_id,
          (
            COALESCE((SELECT SUM(pg_column_size(p.*)) FROM participant p WHERE p."festivalId" = f.id), 0) +
            COALESCE((SELECT SUM(pg_column_size(pr.*)) FROM programme pr WHERE pr."festivalId" = f.id), 0) +
            COALESCE((SELECT SUM(pg_column_size(n.*)) FROM festival_news n WHERE n."festivalId" = f.id), 0) +
            COALESCE((SELECT SUM(pg_column_size(m.*)) FROM festival_media_image m WHERE m."festivalId" = f.id), 0) +
            COALESCE((SELECT SUM(pg_column_size(v.*)) FROM festival_media_video v WHERE v."festivalId" = f.id), 0)
          ) as total_db_bytes
        FROM festival f
      )
      UPDATE festival
      SET "dbStorageBytes" = db_sizes.total_db_bytes
      FROM db_sizes
      WHERE festival.id = db_sizes.festival_id;
    `);

    return NextResponse.json({
      success: true,
      message: "Storage limits recalculated successfully.",
    });
  } catch (error) {
    console.error("Failed to run daily storage calc:", error);
    return NextResponse.json(
      { error: "Failed to calculate storage" },
      { status: 500 },
    );
  }
}
