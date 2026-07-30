import { notFound, redirect } from "next/navigation";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { FestivalExpirationService } from "@/features/festivals/services/festival-expiration.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const festival = await findFestivalBySlug(slug);
  if (!festival) {
    notFound();
  }

  const isExpired =
    festival.status === "EXPIRED" ||
    (festival.expiresAt && new Date(festival.expiresAt) < new Date());

  if (!isExpired) {
    notFound();
  }

  if (festival.resultPdfUrl) {
    redirect(festival.resultPdfUrl);
  }

  const pdfBuffer =
    await FestivalExpirationService.generateExpiredResultsPdfBuffer(
      festival.id,
      festival.name,
    );

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${festival.name}-results.pdf"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}
