import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { FestivalResultsPdfService } from "@/features/festivals/services/festival-results-pdf.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ festivalId: string }> },
) {
  const { festivalId } = await params;

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const festival = await findFestivalById(festivalId);
  if (!festival) {
    notFound();
  }

  const isOwner = festival.ownerId === session.userId;
  const isSuperAdmin = session.role === "SUPER_ADMIN";

  if (!isOwner && !isSuperAdmin) {
    redirect("/profile");
  }

  const isExpired =
    festival.status === "EXPIRED" ||
    (festival.expiresAt && new Date(festival.expiresAt) < new Date());

  if (!isExpired) {
    redirect("/profile");
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
