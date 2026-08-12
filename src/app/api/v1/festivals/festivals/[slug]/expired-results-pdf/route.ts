import { notFound, redirect } from "next/navigation";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { FestivalResultsPdfService } from "@/features/festivals/services/festival-results-pdf.service";

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
    await FestivalResultsPdfService.generateExpiredResultsPdfBuffer(
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
