"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { findFestivalById } from "@/server/models/festival.model";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { ProgrammeReportingService } from "@/server/services/programme-reporting.service";
import { updateProgrammeStatus } from "@/server/services/programme-status.service";
import type { ScheduleEntryType, SessionType } from "@prisma/client";

const scheduleInclude = {
  programme: { select: { id: true, name: true, category: { select: { name: true } } } },
  stage: { select: { id: true, name: true } },
} as const;

export type ScheduleEntryWithRelations = Awaited<
  ReturnType<typeof getScheduleEntries>
>[number];

/** Returns true if [startA, endA] overlaps [startB, endB]. Null end means instant (end = start). */
function rangesOverlap(
  startA: Date,
  endA: Date | null,
  startB: Date,
  endB: Date | null,
): boolean {
  // Always block exact same start time on the same stage.
  if (startA.getTime() === startB.getTime()) return true;
  const aEnd = endA ?? startA;
  const bEnd = endB ?? startB;
  return startA.getTime() < bEnd.getTime() && aEnd.getTime() > startB.getTime();
}

function getEntryDisplayName(entry: {
  type: string;
  title: string | null;
  programme: { name: string } | null;
}): string {
  if (entry.type === "PROGRAMME" && entry.programme?.name)
    return entry.programme.name;
  if (entry.type === "SESSION" && entry.title?.trim()) return entry.title.trim();
  return "an existing entry";
}

export type ConflictParts = {
  prefix: string;
  highlight: string;
  suffix: string;
};

/** Check for same-stage conflict: same start time OR overlapping start/end ranges. Returns structured message for UI highlight or null. */
async function getTimeConflictError(
  festivalId: string,
  startTime: Date,
  endTime: Date | null,
  stageId: string | null,
  excludeEntryId?: string,
): Promise<ConflictParts | null> {
  const others = await prisma.scheduleEntry.findMany({
    where: {
      festivalId,
      stageId,
      ...(excludeEntryId ? { id: { not: excludeEntryId } } : {}),
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      type: true,
      title: true,
      programme: { select: { name: true } },
    },
  });
  for (const o of others) {
    if (rangesOverlap(startTime, endTime, o.startTime, o.endTime)) {
      const timeStr = format(new Date(startTime), "h:mm a");
      const name = getEntryDisplayName(o);
      return {
        prefix: `${timeStr} overlaps with `,
        highlight: name,
        suffix: " on this stage.  Pick another time or another stage.",
      };
    }
  }
  return null;
}

function conflictPartsToMessage(parts: ConflictParts): string {
  return parts.prefix + parts.highlight + parts.suffix;
}

export async function getScheduleEntries(
  festivalId: string,
  typeFilter?: ScheduleEntryType,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  return prisma.scheduleEntry.findMany({
    where: { festivalId, ...(typeFilter ? { type: typeFilter } : {}) },
    include: scheduleInclude,
    orderBy: [{ startTime: "asc" }, { order: "asc" }],
  });
}

/** Public read-only: no auth. Filter by type for sessions (SESSION) or programmes (PROGRAMME) page. */
export async function getScheduleEntriesPublic(
  festivalId: string,
  typeFilter?: ScheduleEntryType,
) {
  return prisma.scheduleEntry.findMany({
    where: { festivalId, ...(typeFilter ? { type: typeFilter } : {}) },
    include: scheduleInclude,
    orderBy: [{ startTime: "asc" }, { order: "asc" }],
  });
}

/** For UI: check if a proposed time/stage would conflict. Returns error message and optional parts for highlighting. */
export async function checkScheduleConflict(
  festivalId: string,
  params: {
    startTime: Date;
    endTime?: Date | null;
    stageId?: string | null;
    excludeEntryId?: string;
  },
): Promise<
  | { ok: true }
  | { ok: false; error: string; conflictParts?: ConflictParts }
> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  const { startTime, endTime = null, stageId = null, excludeEntryId } = params;
  if (endTime != null && endTime <= startTime)
    return { ok: false, error: "End time must be after start time." };
  const conflict = await getTimeConflictError(
    festivalId,
    startTime,
    endTime,
    stageId,
    excludeEntryId,
  );
  if (conflict)
    return {
      ok: false,
      error: conflictPartsToMessage(conflict),
      conflictParts: conflict,
    };
  return { ok: true };
}

async function getDisplayName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, fullName: true, email: true },
  });
  return user?.displayName || user?.fullName || user?.email || "Unknown";
}

export async function createScheduleEntry(
  festivalId: string,
  data: {
    type: ScheduleEntryType;
    programmeId?: string | null;
    stageId?: string | null;
    title?: string | null;
    description?: string | null;
    speakers?: string | null;
    sessionType?: SessionType | null;
    startTime: Date;
    endTime?: Date | null;
    order?: number;
  },
): Promise<
  | { success: true }
  | { success: false; error: string; conflictParts?: ConflictParts }
> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const canManage = await getEffectiveFeatureEnabled(festival.tier, "schedule");
  if (!canManage)
    return { success: false, error: "Schedule is not available on your plan." };

  if (data.type === "PROGRAMME") {
    if (!data.programmeId)
      return { success: false, error: "Please select a programme." };
  } else {
    if (!data.title)
      return { success: false, error: "Please enter a session title." };
    if (data.programmeId)
      return { success: false, error: "Session entries cannot be linked to a programme." };
  }
  if (!data.stageId)
    return { success: false, error: "Please select a stage." };

  if (data.endTime != null && data.endTime <= data.startTime)
    return { success: false, error: "End time must be after start time." };

  const conflict = await getTimeConflictError(
    festivalId,
    data.startTime,
    data.endTime ?? null,
    data.stageId ?? null,
  );
  if (conflict)
    return {
      success: false,
      error: conflictPartsToMessage(conflict),
      conflictParts: conflict,
    };

  const createdBy = session?.userId ? await getDisplayName(session.userId) : null;

  await prisma.scheduleEntry.create({
    data: {
      festivalId,
      type: data.type,
      programmeId: data.type === "PROGRAMME" ? data.programmeId : null,
      stageId: data.stageId || null,
      title: data.type === "SESSION" ? (data.title || null) : null,
      description: data.type === "SESSION" ? (data.description ?? null) : null,
      speakers: data.type === "SESSION" ? (data.speakers ?? null) : null,
      sessionType: data.type === "SESSION" ? (data.sessionType ?? null) : null,
      startTime: data.startTime,
      endTime: data.endTime ?? null,
      order: data.order ?? 0,
      createdBy,
      updatedBy: null,
    },
  });

  if (data.type === "PROGRAMME" && data.programmeId) {
    await updateProgrammeStatus(data.programmeId);
  }

  revalidatePath(`/dashboard/${festival.slug}/pre-works/schedule`);
  revalidatePath(`/dashboard/${festival.slug}/pre-works/sessions`);
  revalidatePath(`/${festival.slug}/sessions`);
  revalidatePath(`/${festival.slug}/programmes`);
  return { success: true };
}

export async function updateScheduleEntry(
  festivalId: string,
  id: string,
  data: {
    programmeId?: string | null;
    stageId?: string | null;
    title?: string | null;
    description?: string | null;
    speakers?: string | null;
    sessionType?: SessionType | null;
    startTime?: Date;
    endTime?: Date | null;
    order?: number;
  },
): Promise<
  | { success: true }
  | { success: false; error: string; conflictParts?: ConflictParts }
> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const existing = await prisma.scheduleEntry.findFirst({
    where: { id, festivalId },
  });
  if (!existing) return { success: false, error: "Schedule entry not found" };

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const canManage = await getEffectiveFeatureEnabled(festival.tier, "schedule");
  if (!canManage)
    return { success: false, error: "Schedule is not available on your plan." };

  if (existing.type === "SESSION" && data.title !== undefined && !data.title)
    return { success: false, error: "Session must have a title." };

  const newStartTime = data.startTime !== undefined ? data.startTime : existing.startTime;
  const newEndTime = data.endTime !== undefined ? data.endTime : existing.endTime;
  const newStageId =
    data.stageId !== undefined ? data.stageId : existing.stageId;

  if (newEndTime != null && newEndTime <= newStartTime)
    return { success: false, error: "End time must be after start time." };

  const conflict = await getTimeConflictError(
    festivalId,
    newStartTime,
    newEndTime ?? null,
    newStageId ?? null,
    id,
  );
  if (conflict)
    return {
      success: false,
      error: conflictPartsToMessage(conflict),
      conflictParts: conflict,
    };

  const updatedBy = session?.userId ? await getDisplayName(session.userId) : null;

  await prisma.scheduleEntry.update({
    where: { id },
    data: {
      ...(data.programmeId !== undefined && { programmeId: data.programmeId }),
      ...(data.stageId !== undefined && { stageId: data.stageId }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.speakers !== undefined && { speakers: data.speakers }),
      ...(data.sessionType !== undefined && { sessionType: data.sessionType }),
      ...(data.startTime !== undefined && { startTime: data.startTime }),
      ...(data.endTime !== undefined && { endTime: data.endTime }),
      ...(data.order !== undefined && { order: data.order }),
      updatedBy,
    },
  });

  if (existing.type === "PROGRAMME") {
    await ProgrammeReportingService.unlockByScheduleEntryChange(existing.id);
    if (existing.programmeId) await updateProgrammeStatus(existing.programmeId);
    if (
      data.programmeId !== undefined &&
      data.programmeId !== null &&
      data.programmeId !== existing.programmeId
    ) {
      await updateProgrammeStatus(data.programmeId);
    }
  }

  revalidatePath(`/dashboard/${festival.slug}/pre-works/schedule`);
  revalidatePath(`/dashboard/${festival.slug}/pre-works/sessions`);
  revalidatePath(`/${festival.slug}/sessions`);
  revalidatePath(`/${festival.slug}/programmes`);
  return { success: true };
}

export async function deleteScheduleEntry(
  festivalId: string,
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const entry = await prisma.scheduleEntry.findFirst({
    where: { id, festivalId },
    select: { id: true, type: true, programmeId: true },
  });
  if (!entry) return { success: false, error: "Schedule entry not found" };

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  await prisma.scheduleEntry.delete({ where: { id } });
  if (entry.type === "PROGRAMME") {
    await ProgrammeReportingService.unlockByScheduleEntryChange(entry.id);
  }

  if (entry.type === "PROGRAMME" && entry.programmeId) {
    await updateProgrammeStatus(entry.programmeId);
  }

  revalidatePath(`/dashboard/${festival.slug}/pre-works/schedule`);
  revalidatePath(`/dashboard/${festival.slug}/pre-works/sessions`);
  revalidatePath(`/${festival.slug}/sessions`);
  revalidatePath(`/${festival.slug}/programmes`);
  return { success: true };
}

/**
 * Reorder schedule entries by reassigning times so the list order matches times.
 * Display order is by startTime then order; so when the user moves an entry up/down,
 * we give the entry that moved to the top the previous top's start/end time, and
 * the previous top gets the moved entry's time (and so on for every position).
 * So: entry at new position i gets startTime/endTime from the entry that was at
 * old position i.
 */
export async function reorderScheduleEntries(
  festivalId: string,
  entryIds: string[],
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const canManage = await getEffectiveFeatureEnabled(festival.tier, "schedule");
  if (!canManage)
    return { success: false, error: "Schedule is not available on your plan." };

  if (entryIds.length === 0) return { success: true };

  const uniqueIds = [...new Set(entryIds)];
  if (uniqueIds.length !== entryIds.length)
    return { success: false, error: "Duplicate entries in order." };

  const oldOrder = await prisma.scheduleEntry.findMany({
    where: { id: { in: entryIds }, festivalId },
    select: { id: true, startTime: true, endTime: true },
    orderBy: [{ startTime: "asc" }, { order: "asc" }],
  });

  if (oldOrder.length !== entryIds.length)
    return { success: false, error: "Some entries not found or not in this festival." };

  await prisma.$transaction(
    entryIds.map((entryId, i) => {
      const { startTime, endTime } = oldOrder[i]!;
      return prisma.scheduleEntry.updateMany({
        where: { id: entryId, festivalId },
        data: { startTime, endTime, order: i },
      });
    }),
  );

  revalidatePath(`/dashboard/${festival.slug}/pre-works/schedule`);
  revalidatePath(`/dashboard/${festival.slug}/pre-works/sessions`);
  revalidatePath(`/${festival.slug}/sessions`);
  revalidatePath(`/${festival.slug}/programmes`);
  return { success: true };
}
