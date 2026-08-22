import "server-only";

import { format } from "date-fns";
import jsPDF from "jspdf";
import { serverNow } from "@/core/datetime/server";

export interface DayWiseScheduleRow {
  startTime: Date;
  endTime: Date | null;
  programmeName: string;
  categoryName: string;
  stageName: string | null;
  description: string | null;
  speakers: string | null;
  entryType: "PROGRAMME" | "SESSION";
}

export interface DayWiseScheduleDay {
  /** Calendar day key in browser-local time (yyyy-MM-dd). */
  dayKey: string;
  rows: DayWiseScheduleRow[];
}

export interface BuildDayWiseSchedulePdfOptions {
  festivalName: string;
  timeDisplay: "START_AND_END" | "START_ONLY";
  includeStage: boolean;
  includeDescription: boolean;
  includeSpeakers: boolean;
  includeEntryType: boolean;
  timezoneOffset?: number;
  days: DayWiseScheduleDay[];
}

const MARGIN = 14;
const LINE = 6;

function shiftToClientTZ(date: Date, clientOffset?: number): Date {
  if (clientOffset === undefined) return date;
  const serverOffset = date.getTimezoneOffset();
  const shiftMs = (serverOffset - clientOffset) * 60000;
  return new Date(date.getTime() + shiftMs);
}

function formatDayHeading(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const sample = new Date(y, m - 1, d, 12, 0);
  const formatted = format(sample, "d-M-yyyy EEEE");
  const todayKey = format(new Date(), "yyyy-MM-dd");
  return todayKey === dayKey ? `${formatted} (Today)` : formatted;
}

function formatTimeRange(
  start: Date,
  end: Date | null,
  mode: "START_AND_END" | "START_ONLY",
  clientOffset?: number,
): string {
  const shiftedStart = shiftToClientTZ(start, clientOffset);
  const startStr = format(shiftedStart, "h:mm a");
  if (mode === "START_ONLY") return startStr;

  if (!end || Number.isNaN(end.getTime())) return `${startStr} –`;
  const shiftedEnd = shiftToClientTZ(end, clientOffset);
  const endStr = format(shiftedEnd, "h:mm a");
  return `${startStr} – ${endStr}`;
}

function programmeLabel(row: DayWiseScheduleRow): string {
  return row.programmeName;
}

export function buildDayWiseSchedulePdf(
  options: BuildDayWiseSchedulePdfOptions,
): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const bottomLimit = pageHeight - MARGIN;

  // Title - Times Italic to emulate the elegant script font from template
  doc.setFont("times", "italic");
  doc.setFontSize(28);
  doc.setTextColor(20, 20, 20);
  
  const titleLines = doc.splitTextToSize(options.festivalName, contentWidth);
  doc.text(titleLines, MARGIN, 24);
  
  let y = 24 + (titleLines.length * 10);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Generated: ${format(shiftToClientTZ(serverNow(), options.timezoneOffset), "d MMM yyyy, h:mm a")}`,
    pageWidth - MARGIN,
    20,
    { align: "right" }
  );

  y += 5;

  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = MARGIN + 4;
    }
  };

  if (options.days.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text(
      "No schedule entries on the selected days.",
      pageWidth / 2,
      y + 10,
      { align: "center" },
    );
    return Buffer.from(doc.output("arraybuffer"));
  }

  let isAlternateRow = false;

  const renderScheduleRow = (row: DayWiseScheduleRow) => {
    const timeText = formatTimeRange(row.startTime, row.endTime, options.timeDisplay, options.timezoneOffset);
    const titleText = row.programmeName;
    
    const bullets: string[] = [];
    bullets.push(`Category: ${row.categoryName}`);
    if (options.includeDescription && row.description) bullets.push(row.description);
    if (options.includeStage && row.stageName) bullets.push(`Stage: ${row.stageName}`);
    if (options.includeSpeakers && row.speakers) bullets.push(`Speakers: ${row.speakers}`);
    if (options.includeEntryType && row.entryType) bullets.push(`Type: ${row.entryType}`);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const splitTitle = doc.splitTextToSize(titleText, contentWidth * 0.75);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const splitBullets = bullets.map(b => doc.splitTextToSize(`• ${b}`, contentWidth * 0.75));
    
    const totalBulletLines = splitBullets.reduce((acc, lines) => acc + lines.length, 0);
    const textHeight = (splitTitle.length * 5.5) + (totalBulletLines * 5);
    const rowHeight = Math.max(textHeight + 10, 18); // Min height of 18mm

    ensureSpace(rowHeight);

    // Row Background
    if (isAlternateRow) {
      doc.setFillColor(232, 240, 242); // Light blueish grey
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(0, y, pageWidth, rowHeight, "F");

    let textY = y + 8; // Top padding

    // Left Column: Programme Name
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(splitTitle, MARGIN, textY);
    textY += (splitTitle.length * 5.5);

    // Left Column: Bullet Details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    splitBullets.forEach(lines => {
      doc.text(lines, MARGIN + 2, textY);
      textY += (lines.length * 5);
    });

    // Right Column: Time
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(timeText, pageWidth - MARGIN, y + 8, { align: "right" });

    y += rowHeight;
    isAlternateRow = !isAlternateRow;
  };

  // Grouping chronologically per day
  for (const day of options.days) {
    if (day.rows.length === 0) continue;
    
    // Render day heading
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(formatDayHeading(day.dayKey), MARGIN, y + 6);
    y += 12;

    // Reset alternate coloring at the start of each day for consistency
    isAlternateRow = false;

    // Sort all rows for the day chronologically
    const sortedRows = [...day.rows].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    for (const row of sortedRows) {
      renderScheduleRow(row);
    }
    
    y += 10; // Space between days
  }

  return Buffer.from(doc.output("arraybuffer"));
}
