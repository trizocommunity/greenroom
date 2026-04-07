import jsPDF from "jspdf";

interface StudentQrData {
  name: string;
  chestNumber: string;
  groupName?: string;
  categoryName?: string;
  profileUrl: string;
  qrCodeDataUrl: string; // Base64 encoded QR image
}

interface GenerateBulkQrPdfOptions {
  festivalName: string;
  students: StudentQrData[];
  fileName?: string;
}

export async function generateBulkQrPdf({
  festivalName,
  students,
  fileName = "student-qr-codes.pdf",
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
      doc.text("Student QR Codes", pageWidth / 2, 95, { align: "center" });

      doc.setFontSize(12);
      doc.text(`Total Students: ${students.length}`, pageWidth / 2, 115, {
        align: "center",
      });
      doc.text(
        `Generated: ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        125,
        { align: "center" },
      );

      // Individual Student Pages
      students.forEach((student, index) => {
        if (index > 0) doc.addPage();

        const startY = margin;

        // Header with student info
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(student.name, margin, startY + 10);

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);

        // Chest Number
        const chestInfo = `Chest #: ${student.chestNumber}`;
        doc.text(chestInfo, margin, startY + 20);

        // Group/Category info
        let infoY = startY + 27;
        if (student.groupName) {
          doc.text(`Group: ${student.groupName}`, margin, infoY);
          infoY += 7;
        }
        if (student.categoryName) {
          doc.text(`Category: ${student.categoryName}`, margin, infoY);
          infoY += 7;
        }

        // QR Code (centered, large)
        const qrSize = 120; // Large QR code for easy scanning
        const qrX = (pageWidth - qrSize) / 2;
        const qrY = startY + 45;

        try {
          doc.addImage(student.qrCodeDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
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
        doc.text(student.profileUrl, pageWidth / 2, urlY + 7, {
          align: "center",
        });

        // Footer with page number
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${index + 1} of ${students.length}`,
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
 * Generate QR code data URLs for multiple students
 * QR codes encode chest numbers for programme reporting
 */
export async function prepareStudentQrData(
  students: Array<{
    name: string;
    chestNumber: string;
    groupName?: string;
    categoryName?: string;
    profileUrl: string;
  }>,
): Promise<StudentQrData[]> {
  const QRCode = (await import("qrcode")).default;

  const qrOptions = {
    width: 400,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  };

  const results: StudentQrData[] = [];

  for (const student of students) {
    try {
      const canvas = document.createElement("canvas");
      // Use chest number for QR code encoding (not profile URL)
      const qrContent = student.chestNumber || student.name || "unknown";
      await QRCode.toCanvas(canvas, qrContent, qrOptions);
      const qrCodeDataUrl = canvas.toDataURL("image/png");

      results.push({
        ...student,
        qrCodeDataUrl,
      });
    } catch (error) {
      console.error(`Failed to generate QR for ${student.name}:`, error);
      // Add placeholder QR (empty canvas)
      results.push({
        ...student,
        qrCodeDataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      });
    }
  }

  return results;
}
