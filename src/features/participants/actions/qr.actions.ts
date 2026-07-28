"use server";

import { asc, eq, sql } from "drizzle-orm";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { APP_URL } from "@/config/routes";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { participant as participantTable } from "@/core/database/schema";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import {
  getParticipantProfileUrl,
  getQrCodeContent,
} from "@/features/participants/services/participant-profile-url";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";

export async function exportParticipantsQrPdfAction(
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

  const participants = await db.query.participant.findMany({
    where: eq(participantTable.festivalId, festivalId),
    with: { group: true, category: true },
    orderBy: [asc(participantTable.name)],
  });

  if (participants.length === 0) {
    return { success: false, error: "No participants to export." };
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

  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];
    const qrContent = getQrCodeContent(participant as any);

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
      (participant.name ?? "—").slice(0, 28),
      margin + col * cellW + padding,
      y + qrSize + 6,
      { maxWidth: cellW - padding * 2 },
    );
    doc.setFontSize(7);
    doc.text(
      `Chest: ${participant.chestNumber ?? "—"}`,
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
  const base64 = btoa(
    new Uint8Array(buf).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      "",
    ),
  );
  const filename = `qr-codes-${festival.slug}-${new Date().toISOString().slice(0, 10)}.pdf`;
  return { success: true, data: base64, filename };
}
