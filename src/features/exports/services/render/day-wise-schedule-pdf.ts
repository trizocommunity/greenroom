import "server-only";

import jsPDF from "jspdf";
import { format } from "date-fns";
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
  includeStage: boolean;
  includeDescription: boolean;
  includeSpeakers: boolean;
  includeEntryType: boolean;
  days: DayWiseScheduleDay[];
}

const MARGIN = 14;
const LINE = 6;

function formatDayHeading(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const sample = new Date(y, m - 1, d, 12, 0);
  const formatted = format(sample, "d-M-yyyy EEEE");
  const todayKey = format(new Date(), "yyyy-MM-dd");
  return todayKey === dayKey ? `${formatted} (Today)` : formatted;
}

function formatTimeRange(start: Date, end: Date | null): string {
  const startStr = format(start, "HH:mm");
  if (!end || Number.isNaN(end.getTime())) return `${startStr} –`;
  const endStr = format(end, "HH:mm");
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(options.festivalName, pageWidth / 2, 24, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(
    `Generated ${format(serverNow(), "d MMM yyyy HH:mm")}`,
    pageWidth / 2,
    32,
    { align: "center" },
  );
  doc.setTextColor(0);

  let y = 44;
  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = MARGIN + 4;
    }
  };

  const columnWeights = (): number[] => {
    const weights: number[] = [1.6, 4];
    if (options.includeEntryType) weights.push(1.2);
    if (options.includeStage) weights.push(2);
    if (options.includeDescription) weights.push(3);
    if (options.includeSpeakers) weights.push(2.5);
    return weights;
  };

  const headers = (): string[] => {
    const out: string[] = ["Time", "Programme/s"];
    if (options.includeEntryType) out.push("Type");
    if (options.includeStage) out.push("Stage");
    if (options.includeDescription) out.push("Description");
    if (options.includeSpeakers) out.push("Speakers");
    return out;
  };

  const renderSection = (heading: string, rows: DayWiseScheduleRow[]) => {
    ensureSpace(LINE * 4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(heading, MARGIN, y);
    y += LINE;

    const cols = headers();
    const weights = columnWeights();
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const colWidths = weights.map((w) => (w / totalWeight) * contentWidth);
    const colX: number[] = [];
    let acc = MARGIN;
    for (const w of colWidths) {
      colX.push(acc);
      acc += w;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(MARGIN, y - 4, contentWidth, LINE, "F");
    cols.forEach((col, i) => {
      doc.text(col, colX[i] + 1.5, y);
    });
    y += LINE;

    doc.setFont("helvetica", "normal");

    // Group rows by time-range key; collapse duplicates ("Essay – M, Poem – E").
    const groups = new Map<string, DayWiseScheduleRow[]>();
    for (const r of rows) {
      const timeKey = formatTimeRange(r.startTime, r.endTime);
      const list = groups.get(timeKey) ?? [];
      list.push(r);
      groups.set(timeKey, list);
    }

    for (const [timeKey, group] of groups) {
      ensureSpace(LINE);
      const programmeNames = group.map(programmeLabel).join(", ");
      const entryTypes = options.includeEntryType
        ? Array.from(new Set(group.map((r) => r.entryType))).join(", ")
        : "";
      const stageNames = options.includeStage
        ? Array.from(new Set(group.map((r) => r.stageName ?? ""))).join(", ")
        : "";
      const descriptions = options.includeDescription
        ? group
            .map((r) => r.description ?? "")
            .filter((s) => s.length > 0)
            .join(" | ")
        : "";
      const speakers = options.includeSpeakers
        ? group
            .map((r) => r.speakers ?? "")
            .filter((s) => s.length > 0)
            .join(", ")
        : "";

      const cells = [timeKey, programmeNames];
      if (options.includeEntryType) cells.push(entryTypes);
      if (options.includeStage) cells.push(stageNames);
      if (options.includeDescription) cells.push(descriptions);
      if (options.includeSpeakers) cells.push(speakers);

      cells.forEach((text, i) => {
        const maxChars = colWidths[i]! / 1.8;
        const clipped = text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
        doc.text(clipped, colX[i] + 1.5, y);
      });
      y += LINE;
    }

    y += LINE;
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

  // Group rows by dayKey → categoryName → morning/afternoon for the layout.
  for (const day of options.days) {
    // Skip days with no rows entirely.
    if (day.rows.length === 0) continue;
    const heading = formatDayHeading(day.dayKey);

    // Bucket rows by category + half-day (morning < 12:00, afternoon >= 12:00).
    const hourOf = (r: DayWiseScheduleRow) => r.startTime.getHours();
    const buckets = new Map<string, DayWiseScheduleRow[]>();
    for (const r of day.rows) {
      const half = hourOf(r) < 12 ? "Morning" : "Afternoon";
      const key = `${r.categoryName}|${half}`;
      const list = buckets.get(key) ?? [];
      list.push(r);
      buckets.set(key, list);
    }

    // Render day heading.
    ensureSpace(LINE * 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(heading, MARGIN, y);
    y += LINE + 2;

    const categoryOrder: string[] = [];
    const seen = new Set<string>();
    for (const r of day.rows) {
      if (!seen.has(r.categoryName)) {
        seen.add(r.categoryName);
        categoryOrder.push(r.categoryName);
      }
    }

    for (const cat of categoryOrder) {
      const morning = buckets.get(`${cat}|Morning`) ?? [];
      const afternoon = buckets.get(`${cat}|Afternoon`) ?? [];
      if (morning.length > 0) {
        renderSection(`${cat} — Morning`, morning);
      }
      if (afternoon.length > 0) {
        renderSection(`${cat} — Afternoon`, afternoon);
      }
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}