import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { getExportForDownload } from "@/features/exports/repositories/export.repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const row = await getExportForDownload(id);
  if (!row) {
    return new Response("Export not found", { status: 404 });
  }

  const session = await getSession();
  try {
    await assertFestivalAccess(session, row.festivalId);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  if (row.status !== "COMPLETED" || !row.fileData) {
    return new Response("Export is not ready", { status: 409 });
  }

  if (new Date(row.expiresAt) < new Date()) {
    return new Response("Export has expired", { status: 410 });
  }

  const buffer = Buffer.from(row.fileData, "base64");
  const fileName = row.fileName ?? `export-${row.id}`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": row.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "no-store",
    },
  });
}
