import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { expiredFestivalResult as resultTable } from "@/core/database/schema";
import { findFestivalBySlugOrId } from "@/features/festivals/repositories/festival.repository";
import { FestivalExpirationService } from "@/features/festivals/services/festival-expiration.service";

/**
 * GET: Download results PDF for an expired festival (owner only).
 * If resultPdfUrl is set, redirects to it; otherwise generates PDF from snapshot.
 * Segment can be festival slug or id.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: slugOrId } = await params;
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const festival = await findFestivalBySlugOrId(slugOrId);
  if (!festival) {
    return NextResponse.json({ error: "Festival not found" }, { status: 404 });
  }
  const isOwner = festival.ownerId === session.userId;
  const isSuperAdmin = session.role === "SUPER_ADMIN";
  if (!isOwner && !isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
