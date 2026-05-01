"use server";

import { randomUUID } from "crypto";
import { format } from "date-fns";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  programme as programmeTable,
  scheduleEntry as scheduleEntryTable,
  stage as stageTable,
  user as userTable,
} from "@/core/database/schema";
import type { Tier } from "@/core/types/app-enums";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { getEffectiveFeatureEnabled } from "@/features/plan-features/services/plan-features.service";
import { ProgrammeReportingService } from "@/features/programmes/services/programme-reporting.service";
import { updateProgrammeStatus } from "@/features/programmes/services/programme-status.service";

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
  if (entry.type === "SESSION" && entry.title?.trim())
    return entry.title.trim();
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
  const where = and(
    eq(scheduleEntryTable.festivalId, festivalId),
    stageId
      ? eq(scheduleEntryTable.stageId, stageId)
      : isNull(scheduleEntryTable.stageId),
    excludeEntryId ? ne(scheduleEntryTable.id, excludeEntryId) : undefined,
  );

  const others = await db.query.scheduleEntry.findMany({
    where,
    with: {
      programme: { columns: { name: true } },
    },
  });

  for (const o of others) {
    if (
      rangesOverlap(
        startTime,
        endTime,
        new Date(o.startTime),
        o.endTime ? new Date(o.endTime) : null,
      )
    ) {
      const timeStr = format(startTime, "h:mm a");
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

// Helper for Drizzle isNull since I can't import it easily without checking where it is
function isNull(column: any) {
  return sql`${column} IS NULL`;
}

function conflictPartsToMessage(parts: ConflictParts): string {
  return parts.prefix + parts.highlight + parts.suffix;
}

export async function getScheduleEntries(
  festivalId: string,
  typeFilter?: "PROGRAMME" | "SESSION",
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  return db.query.scheduleEntry.findMany({
    where: and(
      eq(scheduleEntryTable.festivalId, festivalId),
      typeFilter ? eq(scheduleEntryTable.type, typeFilter) : undefined,
    ),
    with: {
      programme: {
        with: { category: true },
      },
      stage: true,
    },
    orderBy: [asc(scheduleEntryTable.startTime), asc(scheduleEntryTable.order)],
  });
}

export async function getScheduleEntriesPublic(
  festivalId: string,
  typeFilter?: "PROGRAMME" | "SESSION",
) {
  return db.query.scheduleEntry.findMany({
    where: and(
      eq(scheduleEntryTable.festivalId, festivalId),
      typeFilter ? eq(scheduleEntryTable.type, typeFilter) : undefined,
    ),
    with: {
      programme: {
        with: { category: true },
      },
      stage: true,
    },
    orderBy: [asc(scheduleEntryTable.startTime), asc(scheduleEntryTable.order)],
  });
}

export async function checkScheduleConflict(
  festivalId: string,
  params: {
    startTime: Date;
    endTime?: Date | null;
    stageId?: string | null;
    excludeEntryId?: string;
  },
): Promise<
  { ok: true } | { ok: false; error: string; conflictParts?: ConflictParts }
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
  const user = await db.query.user.findFirst({
    where: eq(userTable.id, userId),
    columns: { displayName: true, fullName: true, email: true },
  });
  return user?.displayName || user?.fullName || user?.email || "Unknown";
}

export async function createScheduleEntry(
  festivalId: string,
  data: {
    type: "PROGRAMME" | "SESSION";
    programmeId?: string | null;
    stageId?: string | null;
    title?: string | null;
    description?: string | null;
    speakers?: string | null;
    sessionType?: "GENERAL" | "CEREMONY" | "TALK" | "CONCERT" | null;
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

  const canManage = await getEffectiveFeatureEnabled(
    festival.tier as Tier,
    "schedule",
  );
  if (!canManage)
    return { success: false, error: "Schedule is not available on your plan." };

  if (data.type === "PROGRAMME") {
    if (!data.programmeId)
      return { success: false, error: "Please select a programme." };
  } else {
    if (!data.title)
      return { success: false, error: "Please enter a session title." };
    if (data.programmeId)
      return {
        success: false,
        error: "Session entries cannot be linked to a programme.",
      };
  }
  if (!data.stageId) return { success: false, error: "Please select a stage." };

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

  const createdBy = session?.userId
    ? await getDisplayName(session.userId)
    : null;

  const now = new Date().toISOString();
  await db.insert(scheduleEntryTable).values({
    id: randomUUID(),
    festivalId,
    type: data.type,
    programmeId: data.type === "PROGRAMME" ? data.programmeId : null,
    stageId: data.stageId || null,
    title: data.type === "SESSION" ? data.title || null : null,
    description: data.type === "SESSION" ? (data.description ?? null) : null,
    speakers: data.type === "SESSION" ? (data.speakers ?? null) : null,
    sessionType: data.type === "SESSION" ? (data.sessionType ?? null) : null,
    startTime: data.startTime.toISOString(),
    endTime: data.endTime?.toISOString() ?? null,
    order: data.order ?? 0,
    createdBy,
    updatedBy: null,
    updatedAt: now,
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
    sessionType?: "GENERAL" | "CEREMONY" | "TALK" | "CONCERT" | null;
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

  const existing = await db.query.scheduleEntry.findFirst({
    where: and(
      eq(scheduleEntryTable.id, id),
      eq(scheduleEntryTable.festivalId, festivalId),
    ),
  });
  if (!existing) return { success: false, error: "Schedule entry not found" };

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const canManage = await getEffectiveFeatureEnabled(
    festival.tier as Tier,
    "schedule",
  );
  if (!canManage)
    return { success: false, error: "Schedule is not available on your plan." };

  if (existing.type === "SESSION" && data.title !== undefined && !data.title)
    return { success: false, error: "Session must have a title." };

  const newStartTime =
    data.startTime !== undefined
      ? data.startTime
      : new Date(existing.startTime);
  const newEndTime =
    data.endTime !== undefined
      ? data.endTime
      : existing.endTime
        ? new Date(existing.endTime)
        : null;
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

  const updatedBy = session?.userId
    ? await getDisplayName(session.userId)
    : null;

  const now = new Date().toISOString();
  await db
    .update(scheduleEntryTable)
    .set({
      ...(data.programmeId !== undefined && { programmeId: data.programmeId }),
      ...(data.stageId !== undefined && { stageId: data.stageId }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.speakers !== undefined && { speakers: data.speakers }),
      ...(data.sessionType !== undefined && { sessionType: data.sessionType }),
      ...(data.startTime !== undefined && {
        startTime: data.startTime.toISOString(),
      }),
      ...(data.endTime !== undefined && {
        endTime: data.endTime?.toISOString() ?? null,
      }),
      ...(data.order !== undefined && { order: data.order }),
      updatedBy,
      updatedAt: now,
    })
    .where(eq(scheduleEntryTable.id, id));

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

  const entry = await db.query.scheduleEntry.findFirst({
    where: and(
      eq(scheduleEntryTable.id, id),
      eq(scheduleEntryTable.festivalId, festivalId),
    ),
    columns: { id: true, type: true, programmeId: true },
  });
  if (!entry) return { success: false, error: "Schedule entry not found" };

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  await db.delete(scheduleEntryTable).where(eq(scheduleEntryTable.id, id));
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

export async function reorderScheduleEntries(
  festivalId: string,
  entryIds: string[],
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const canManage = await getEffectiveFeatureEnabled(
    festival.tier as Tier,
    "schedule",
  );
  if (!canManage)
    return { success: false, error: "Schedule is not available on your plan." };

  if (entryIds.length === 0) return { success: true };

  const uniqueIds = [...new Set(entryIds)];
  if (uniqueIds.length !== entryIds.length)
    return { success: false, error: "Duplicate entries in order." };

  const oldOrder = await db.query.scheduleEntry.findMany({
    where: and(
      inArray(scheduleEntryTable.id, entryIds),
      eq(scheduleEntryTable.festivalId, festivalId),
    ),
    columns: { id: true, startTime: true, endTime: true },
    orderBy: [asc(scheduleEntryTable.startTime), asc(scheduleEntryTable.order)],
  });

  if (oldOrder.length !== entryIds.length)
    return {
      success: false,
      error: "Some entries not found or not in this festival.",
    };

  await db.transaction(async (tx) => {
    const now = new Date().toISOString();
    for (let i = 0; i < entryIds.length; i++) {
      const entryId = entryIds[i];
      const { startTime, endTime } = oldOrder[i]!;
      await tx
        .update(scheduleEntryTable)
        .set({
          startTime,
          endTime,
          order: i,
          updatedAt: now,
        })
        .where(
          and(
            eq(scheduleEntryTable.id, entryId),
            eq(scheduleEntryTable.festivalId, festivalId),
          ),
        );
    }
  });

  revalidatePath(`/dashboard/${festival.slug}/pre-works/schedule`);
  revalidatePath(`/dashboard/${festival.slug}/pre-works/sessions`);
  revalidatePath(`/${festival.slug}/sessions`);
  revalidatePath(`/${festival.slug}/programmes`);
  return { success: true };
}
