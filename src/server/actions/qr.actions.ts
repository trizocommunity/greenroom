"use server";

import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { APP_URL } from "@/config/routes";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { student as studentTable } from "@/server/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import {
  getQrCodeContent,
  getStudentProfileUrl,
} from "@/lib/student-profile-url";
import { findFestivalById } from "@/server/models/festival.model";

export async function exportStudentsQrPdfAction(
  festivalId: string,
): Promise<
  | { success: true; data: string; filename: string }
  | { success: false; error: string }
> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  if (
    !FeatureService.isFeatureEnabled(
      getTierForFeatureCheck(festival.tier as any),
      "qrCodes",
    )
  ) {
    return {
      success: false,
      error: "QR Codes export is not available on your plan.",
    };
  }

  const students = await db.query.student.findMany({
    where: eq(studentTable.festivalId, festivalId),
    with: { group: true, category: true },
    orderBy: [asc(sql`group.name`), asc(studentTable.name)],
  });

  if (students.length === 0) {
    return { success: false, error: "No students to export." };
  }

  const baseUrl = APP_URL.replace(/\/$/, "");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const cols = 2;
  const cellW = (pageW - margin * 2) / cols;
  const qrSize = 35;
  const labelH = 12;
  const cellH = qrSize + labelH * 2;
  const padding = 5;

  let row = 0;
  let col = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const qrContent = getQrCodeContent(student as any);

    const x = margin + col * cellW + (cellW - qrSize) / 2;
    const y = margin + row * cellH + 2;

    try {
      const dataUrl = await QRCode.toDataURL(qrContent, {
        width: 256,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
      doc.addImage(dataUrl, "PNG", x, y, qrSize, qrSize);
    } catch {
      doc.setFontSize(8);
      doc.text("QR failed", x, y + qrSize / 2);
    }

    doc.setFontSize(8);
    doc.text(
      (student.name ?? "—").slice(0, 28),
      margin + col * cellW + padding,
      y + qrSize + 6,
      { maxWidth: cellW - padding * 2 },
    );
    doc.setFontSize(7);
    doc.text(
      `Chest: ${student.chestNumber ?? "—"}`,
      margin + col * cellW + padding,
      y + qrSize + 12,
      { maxWidth: cellW - padding * 2 },
    );

    col++;
    if (col >= cols) {
      col = 0;
      row++;
      if (margin + (row + 1) * cellH > pageH - margin) {
        doc.addPage();
        row = 0;
      }
    }
  }

  const buf = doc.output("arraybuffer");
  const base64 = Buffer.from(buf).toString("base64");
  const filename = `qr-codes-${festival.slug}-${new Date().toISOString().slice(0, 10)}.pdf`;
  return { success: true, data: base64, filename };
}
