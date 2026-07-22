import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { decrypt, type SessionPayload } from "@/core/auth/session";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { ManualBookService } from "@/features/festivals/services/manual-book.service";

export async function GET(
  request: Request,
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

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") || "json") as
    | "pdf"
    | "json"
    | "zip";

  if (!["pdf", "json", "zip"].includes(format)) {
    redirect(`/api/profile/festivals/${festivalId}/manual-book?format=json`);
  }

  const buffer = await ManualBookService.export(festivalId, format);

  if (!buffer) {
    notFound();
  }

  const contentTypes: Record<string, string> = {
    pdf: "application/pdf",
    json: "application/json",
    zip: "application/zip",
  };

  const filenames: Record<string, string> = {
    pdf: `${festival.name}-manual-book.pdf`,
    json: `${festival.name}-manual-book.json`,
    zip: `${festival.name}-manual-book.zip`,
  };

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentTypes[format],
      "Content-Disposition": `attachment; filename="${filenames[format]}"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
