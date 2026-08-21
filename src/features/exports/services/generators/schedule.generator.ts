import "server-only";

import { format } from "date-fns";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  scheduleEntry as scheduleEntryTable,
} from "@/core/database/schema";
import { parseInstant } from "@/core/datetime";
import type { ScheduleConfig } from "@/features/exports/schemas/export-config.schema";
import {
  buildDayWiseSchedulePdf,
  type DayWiseScheduleDay,
  type DayWiseScheduleRow,
} from "@/features/exports/services/render/day-wise-schedule-pdf";
import { PDF_MIME } from "@/features/exports/services/render/pdf-doc";
import type {
  ExportFormat,
  GeneratedExport,
} from "@/features/exports/types/export.types";
import { getFestivalDateKeySet } from "@/features/schedule/utils/festival-schedule-days";

export async function generateSchedule(
  festivalId: string,
  config: ScheduleConfig,
  _format: ExportFormat,
  festivalName: string,
): Promise<GeneratedExport> {
  const festivalRow = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { startDate: true, endDate: true },
  });

  // Resolve the calendar days that are allowed for this export. If the
  // user picked specific days, intersect with the festival range (only
  // days that actually exist on the festival). An empty list is treated
  // as "every festival day".
  const festivalDayKeys =
    getFestivalDateKeySet(
      festivalRow?.startDate ?? null,
      festivalRow?.endDate ?? null,
    ) ?? new Set<string>();

  const selectedKeys =
    config.days.length > 0
      ? config.days.filter(
          (d) => festivalDayKeys.size === 0 || festivalDayKeys.has(d),
        )
      : [...festivalDayKeys];

  const entries = await db.query.scheduleEntry.findMany({
    where: and(eq(scheduleEntryTable.festivalId, festivalId)),
    with: {
      programme: { with: { category: true } },
      stage: true,
    },
    orderBy: [asc(scheduleEntryTable.startTime), asc(scheduleEntryTable.order)],
  });

  const rowsByDay = new Map<string, DayWiseScheduleRow[]>();
  for (const e of entries) {
    const startInstant = parseInstant(e.startTime);
    if (!startInstant) continue;

    const dayKey = formatDayKey(startInstant);
    if (selectedKeys.length > 0 && !selectedKeys.includes(dayKey)) continue;

    const programmeName =
      e.type === "SESSION"
        ? (e.title ?? e.sessionType ?? "Session")
        : (e.programme?.name ?? "—");
    const categoryName =
      e.programme?.category?.name ?? (e.type === "SESSION" ? "Sessions" : "—");

    const row: DayWiseScheduleRow = {
      startTime: startInstant,
      endTime: parseInstant(e.endTime),
      programmeName,
      categoryName,
      stageName: e.stage?.name ?? null,
      description: e.description ?? null,
      speakers: e.speakers ?? null,
      entryType: e.type,
    };

    const list = rowsByDay.get(dayKey) ?? [];
    list.push(row);
    rowsByDay.set(dayKey, list);
  }

  // Preserve the user's selected order (or festival-day order) in the PDF.
  const orderedKeys = selectedKeys;
  const days: DayWiseScheduleDay[] = [];
  for (const k of orderedKeys) {
    const list = rowsByDay.get(k) ?? [];
    if (list.length === 0) continue;
    list.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    days.push({ dayKey: k, rows: list });
  }

  if (days.length === 0) {
    throw new Error(
      config.days.length > 0
        ? "No schedule entries on the selected days."
        : "No schedule entries on the festival days.",
    );
  }

  const fileName =
    config.days.length === 1
      ? `schedule-${config.days[0]}.pdf`
      : config.days.length > 1
        ? `schedule-${config.days.length}days.pdf`
        : "schedule.pdf";

  return {
    bytes: buildDayWiseSchedulePdf({
      festivalName,
      includeStage: config.includeStage,
      includeDescription: config.includeDescription,
      includeSpeakers: config.includeSpeakers,
      includeEntryType: config.includeEntryType,
      days,
    }),
    fileName,
    mimeType: PDF_MIME,
    itemCount: entries.length,
  };
}

function formatDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
