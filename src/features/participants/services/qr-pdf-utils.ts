import jsPDF from "jspdf";

import { formatDate } from "@/core/datetime";
import { serverNow } from "@/core/datetime/server";

interface ParticipantQrData {
  name: string;
  chestNumber: string;
  groupName?: string;
  categoryName?: string;
  profileUrl: string;
  qrCodeDataUrl: string; // Base64 encoded QR image
}

interface GenerateBulkQrPdfOptions {
  festivalName: string;
  participants: ParticipantQrData[];
  fileName?: string;
  timezone?: string;
}

export async function generateBulkQrPdf({
  festivalName,
  participants,
  fileName = "participant-qr-codes.pdf",
  timezone = "UTC",
}: GenerateBulkQrPdfOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      // Cover Page
      doc.setFillColor(240, 240, 240);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      doc.text(festivalName, pageWidth / 2, 80, { align: "center" });

      doc.setFontSize(16);
      doc.setTextColor(100, 100, 100);
      doc.text("Participant QR Codes", pageWidth / 2, 95, { align: "center" });

      doc.setFontSize(12);
      doc.text(
        `Total Participants: ${participants.length}`,
        pageWidth / 2,
        115,
        {
          align: "center",
        },
      );
      doc.text(
        `Generated: ${formatDate(serverNow(), { tz: timezone, style: "medium" })}`,
        pageWidth / 2,
        125,
        { align: "center" },
      );

      // Individual Participant Pages
      participants.forEach((participant, index) => {
        if (index > 0) doc.addPage();

        const startY = margin;

        // Header with participant info
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(participant.name, margin, startY + 10);

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);

        // Chest Number
        const chestInfo = `Chest #: ${participant.chestNumber}`;
        doc.text(chestInfo, margin, startY + 20);

        // Group/Category info
        let infoY = startY + 27;
        if (participant.groupName) {
          doc.text(`Group: ${participant.groupName}`, margin, infoY);
          infoY += 7;
        }
        if (participant.categoryName) {
          doc.text(`Category: ${participant.categoryName}`, margin, infoY);
          infoY += 7;
        }

        // QR Code (centered, large)
        const qrSize = 120; // Large QR code for easy scanning
        const qrX = (pageWidth - qrSize) / 2;
        const qrY = startY + 45;

        try {
          doc.addImage(
            participant.qrCodeDataUrl,
            "PNG",
            qrX,
            qrY,
            qrSize,
            qrSize,
          );
        } catch (imgError) {
          console.error("Failed to add QR image:", imgError);
          doc.text("[QR Code Failed to Load]", qrX, qrY + 60, {
            align: "center",
          });
        }

        // Profile URL below QR
        const urlY = qrY + qrSize + 15;
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text("Scan to view profile or visit:", pageWidth / 2, urlY, {
          align: "center",
        });

        doc.setFontSize(11);
        doc.setTextColor(0, 100, 200);
        doc.text(participant.profileUrl, pageWidth / 2, urlY + 7, {
          align: "center",
        });

        // Footer with page number
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${index + 1} of ${participants.length}`,
          pageWidth / 2,
          pageHeight - 15,
          { align: "center" },
        );
      });

      // Save the PDF
      doc.save(fileName);
      resolve();
    } catch (error) {
      console.error("PDF generation failed:", error);
      reject(error);
    }
  });
}

/**
 * Generate QR code data URLs for multiple participants
 * QR codes encode chest numbers for programme reporting
 */
export async function prepareParticipantQrData(
  participants: Array<{
    name: string;
    chestNumber: string;
    groupName?: string;
    categoryName?: string;
    profileUrl: string;
  }>,
): Promise<ParticipantQrData[]> {
  const QRCode = (await import("qrcode")).default;

  const qrOptions = {
    width: 400,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  };

  const results: ParticipantQrData[] = [];

  for (const participant of participants) {
    try {
      const canvas = document.createElement("canvas");
      // Use chest number for QR code encoding (not profile URL)
      const qrContent =
        participant.chestNumber || participant.name || "unknown";
      await QRCode.toCanvas(canvas, qrContent, qrOptions);
      const qrCodeDataUrl = canvas.toDataURL("image/png");

      results.push({
        ...participant,
        qrCodeDataUrl,
      });
    } catch (error) {
      console.error(`Failed to generate QR for ${participant.name}:`, error);
      // Add placeholder QR (empty canvas)
      results.push({
        ...participant,
        qrCodeDataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      });
    }
  }

  return results;
}
