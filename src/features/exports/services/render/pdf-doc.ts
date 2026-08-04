import "server-only";

import jsPDF from "jspdf";
import { formatDateTime } from "@/core/datetime";
import { serverNow } from "@/core/datetime/server";
import type { PageLayout } from "@/features/exports/schemas/export-config.schema";

export interface PdfSection {
  heading: string;
  subheading?: string;
  columns: string[];
  rows: (string | number)[][];
  /** Optional relative column widths; defaults to equal split. */
  columnWeights?: number[];
}

export interface BuildPdfOptions {
  festivalName: string;
  title: string;
  sections: PdfSection[];
  pageLayout: PageLayout;
  emptyMessage?: string;
  /** IANA timezone used for the "Generated on" footer. */
  timezone?: string;
}

const MARGIN = 14;
const LINE = 6;

export const PDF_MIME = "application/pdf";

/**
 * Render a list of grouped tables to a single PDF. Used by every data export
 * that produces a document (call lists, results, valuation sheets, ...).
 * `SINGLE_PER_PAGE` starts each section on a fresh page; `CONTINUOUS_GRID`
 * lets sections flow one after another.
 */
export function buildSectionedPdf(options: BuildPdfOptions): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const bottomLimit = pageHeight - MARGIN;

  // ── Title block ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(options.festivalName, pageWidth / 2, 24, { align: "center" });
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(options.title, pageWidth / 2, 32, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Generated ${formatDateTime(serverNow(), { tz: options.timezone, dateStyle: "medium", timeStyle: "short" })}`,
    pageWidth / 2,
    38,
    {
      align: "center",
    },
  );
  doc.setTextColor(0);

  let y = 48;

  if (options.sections.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text(
      options.emptyMessage ?? "No data matched the selected filters.",
      pageWidth / 2,
      y + 10,
      { align: "center" },
    );
    return Buffer.from(doc.output("arraybuffer"));
  }

  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = MARGIN + 4;
    }
  };

  options.sections.forEach((section, index) => {
    if (options.pageLayout === "SINGLE_PER_PAGE" && index > 0) {
      doc.addPage();
      y = MARGIN + 4;
    } else {
      ensureSpace(LINE * 3);
    }

    // Section heading
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(section.heading, MARGIN, y);
    y += LINE;
    if (section.subheading) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(section.subheading, MARGIN, y);
      doc.setTextColor(0);
      y += LINE;
    }

    const weights =
      section.columnWeights &&
      section.columnWeights.length === section.columns.length
        ? section.columnWeights
        : section.columns.map(() => 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const colWidths = weights.map((w) => (w / totalWeight) * contentWidth);
    const colX: number[] = [];
    let acc = MARGIN;
    for (const w of colWidths) {
      colX.push(acc);
      acc += w;
    }

    // Header row
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(MARGIN, y - 4, contentWidth, LINE, "F");
    section.columns.forEach((col, i) => {
      doc.text(String(col), colX[i] + 1.5, y);
    });
    y += LINE;

    // Body rows
    doc.setFont("helvetica", "normal");
    section.rows.forEach((row) => {
      ensureSpace(LINE);
      row.forEach((cell, i) => {
        const text = cell === null || cell === undefined ? "" : String(cell);
        const maxWidth = colWidths[i] - 3;
        const clipped = doc.splitTextToSize(text, maxWidth)[0] ?? "";
        doc.text(String(clipped), colX[i] + 1.5, y);
      });
      y += LINE;
    });

    y += LINE; // gap after section
  });

  return Buffer.from(doc.output("arraybuffer"));
}
