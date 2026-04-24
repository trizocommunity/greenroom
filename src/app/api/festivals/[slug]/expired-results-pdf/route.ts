import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expiredFestivalResult as resultTable } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { FestivalExpirationService } from "@/server/services/festival-expiration.service";

/**
 * GET: Public download of results PDF for an expired festival (by slug).
 * No auth required; only works when festival is expired.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) {
    return NextResponse.json({ error: "Festival not found" }, { status: 404 });
  }
  const isExpired =
    festival.status === "EXPIRED" ||
    (festival.expiresAt && new Date(festival.expiresAt) < new Date());
  if (!isExpired) {
    return NextResponse.json(
      { error: "Festival is not expired" },
      { status: 400 },
    );
  }

  if (festival.resultPdfUrl) {
    return NextResponse.redirect(festival.resultPdfUrl);
  }

  const [countResult] = await db
    .select({ count: sql`count(*)` })
    .from(resultTable)
    .where(eq(resultTable.festivalId, festival.id));
  const count = Number(countResult.count);

  if (count === 0) {
    return NextResponse.json(
      { error: "No results snapshot available" },
      { status: 404 },
    );
  }

  const buffer =
    await FestivalExpirationService.generateExpiredResultsPdfBuffer(
      festival.id,
      festival.name,
    );
  const filename = `results-${festival.slug}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
