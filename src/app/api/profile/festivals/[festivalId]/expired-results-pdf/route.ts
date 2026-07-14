import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { decrypt, type SessionPayload } from "@/core/auth/session";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { FestivalExpirationService } from "@/features/festivals/services/festival-expiration.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ festivalId: string }> },
) {
  const { festivalId } = await params;

  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (!session) {
    redirect("/login");
  }

  let user: SessionPayload | null = null;
  try {
    user = await decrypt(session);
  } catch {
    redirect("/login");
  }

  const festival = await findFestivalById(festivalId);
  if (!festival) {
    notFound();
  }

  const isOwner = festival.ownerId === user!.userId;
  const isSuperAdmin = user!.role === "SUPER_ADMIN";

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
