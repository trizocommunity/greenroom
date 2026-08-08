"use server";

import { randomUUID } from "crypto";
import { format } from "date-fns";
import { and, asc, count, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  programmeAssignment as assignmentTable,
  programme as programmeTable,
  scheduleEntry as scheduleEntryTable,
  user as userTable,
} from "@/core/database/schema";
import { parseInstant } from "@/core/datetime";
import { serverNowIso } from "@/core/datetime/server";
import type { AppError } from "@/core/errors/errors";
import type { Tier } from "@/core/types/app-enums";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { isEnabled } from "@/features/plan-features/services/feature-gate";
import { loadFeatureOverrides } from "@/features/plan-features/services/plan-features.service";
import {
  assertProgrammePreReporting,
  updateProgrammeStatus,
} from "@/features/programmes/services/programme-status.service";
import { assertStageBelongsToFestival } from "@/features/schedule/utils/assert-stage-belongs-to-festival";
import { parseStoredScheduleInstant } from "@/features/schedule/utils/schedule-datetime";
import {
  handleProgrammeEntryMutation,
  revalidateSchedulePaths,
} from "@/features/schedule/utils/schedule-orchestration";
import { validateScheduleTimesForFestival } from "@/features/schedule/utils/schedule-times-validation";
import { StageAssignmentService } from "@/features/stages/services/stage-assignment.service";

async function assertCanWriteOnStage(
  festivalId: string,
  stageId: string | null | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  const accessibleStageIds = await StageAssignmentService.getAccessibleStageIds(
    festivalId,
    session,
  );
  if (accessibleStageIds === "all") return { ok: true };
  if (stageId && accessibleStageIds.includes(stageId)) return { ok: true };
  return {
    ok: false,
    error: "You can only schedule on your assigned stages.",
  };
}

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
  /** Only compare against entries of this type (programme vs session schedules). */
  entryType?: "PROGRAMME" | "SESSION",
): Promise<ConflictParts | null> {
  const where = and(
    eq(scheduleEntryTable.festivalId, festivalId),
    stageId
      ? eq(scheduleEntryTable.stageId, stageId)
      : isNull(scheduleEntryTable.stageId),
    excludeEntryId ? ne(scheduleEntryTable.id, excludeEntryId) : undefined,
    entryType ? eq(scheduleEntryTable.type, entryType) : undefined,
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
        parseStoredScheduleInstant(o.startTime),
        o.endTime ? parseStoredScheduleInstant(o.endTime) : null,
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

function conflictPartsToMessage(parts: ConflictParts): string {
  return parts.prefix + parts.highlight + parts.suffix;
}

export async function getScheduleEntries(
  festivalId: string,
  typeFilter?: "PROGRAMME" | "SESSION",
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const accessibleStageIds = await StageAssignmentService.getAccessibleStageIds(
    festivalId,
    session,
  );

  return db.query.scheduleEntry.findMany({
    where: and(
      eq(scheduleEntryTable.festivalId, festivalId),
      typeFilter ? eq(scheduleEntryTable.type, typeFilter) : undefined,
      accessibleStageIds === "all"
        ? undefined
        : accessibleStageIds.length > 0
          ? inArray(scheduleEntryTable.stageId, accessibleStageIds)
          : inArray(scheduleEntryTable.id, ["__none__"]),
    ),
    with: {
      programme: {
        with: { category: true },
      },
      stage: true,
      updaterUser: { columns: { fullName: true, displayName: true } },
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
      updaterUser: { columns: { fullName: true, displayName: true } },
    },
    orderBy: [asc(scheduleEntryTable.startTime), asc(scheduleEntryTable.order)],
  });
}

export type SchedulableProgramme = {
  id: string;
  name: string;
  nameSecondary: string | null;
  categoryId: string | null;
  categoryName: string | null;
  type: "INDIVIDUAL" | "GROUP";
  durationMode: "SEQUENTIAL" | "PARALLEL";
  timePerUnitMinutes: number;
  parallelDurationMinutes: number | null;
  assignmentCount: number;
  teamCount: number;
};

export async function getSchedulableProgrammesAction(
  festivalId: string,
): Promise<SchedulableProgramme[]> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const allProgrammes = await db.query.programme.findMany({
    where: (programmeTable, { eq }) =>
      eq(programmeTable.festivalId, festivalId),
    columns: {
      id: true,
      name: true,
      nameSecondary: true,
      categoryId: true,
      type: true,
      durationMode: true,
      timePerUnitMinutes: true,
      parallelDurationMinutes: true,
      maxTeamsPerGroup: true,
    },
    with: {
      category: { columns: { id: true, name: true } },
    },
    orderBy: (programmeTable, { asc }) => asc(programmeTable.name),
  });

  const alreadyScheduled = await db.query.scheduleEntry.findMany({
    where: and(
      eq(scheduleEntryTable.festivalId, festivalId),
      eq(scheduleEntryTable.type, "PROGRAMME"),
    ),
    columns: { programmeId: true },
  });
  const scheduledProgrammeIds = new Set(
    alreadyScheduled
      .map((row) => row.programmeId)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  const assignmentCounts = await db
    .select({
      programmeId: assignmentTable.programmeId,
      count: count(),
      teamCount: sql<number>`COUNT(DISTINCT (${assignmentTable.groupId}, ${assignmentTable.teamNumber}))`,
    })
    .from(assignmentTable)
    .where(eq(assignmentTable.festivalId, festivalId))
    .groupBy(assignmentTable.programmeId);

  const countMap = new Map(
    assignmentCounts
      .filter((r): r is typeof r & { programmeId: string } => !!r.programmeId)
      .map((r) => [r.programmeId, { count: r.count, teamCount: r.teamCount }]),
  );

  return allProgrammes
    .filter((p) => !scheduledProgrammeIds.has(p.id) && countMap.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      nameSecondary: p.nameSecondary ?? null,
      categoryId: p.category?.id ?? null,
      categoryName: p.category?.name ?? null,
      type: p.type,
      durationMode: p.durationMode,
      timePerUnitMinutes: p.timePerUnitMinutes,
      parallelDurationMinutes: p.parallelDurationMinutes ?? null,
      assignmentCount: countMap.get(p.id)?.count ?? 0,
      teamCount: countMap.get(p.id)?.teamCount ?? 0,
    }));
}

export async function checkScheduleConflict(
  festivalId: string,
  params: {
    startTime: Date;
    endTime?: Date | null;
    stageId?: string | null;
    excludeEntryId?: string;
    /** Selected calendar day (yyyy-MM-dd); required for strict festival-day checks */
    scheduleDayKey?: string | null;
    entryType: "PROGRAMME" | "SESSION";
  },
): Promise<
  { ok: true } | { ok: false; error: string; conflictParts?: ConflictParts }
> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  const {
    startTime,
    endTime = null,
    stageId = null,
    excludeEntryId,
    scheduleDayKey,
    entryType,
  } = params;

  const festival = await findFestivalById(festivalId);
  if (!festival) return { ok: false, error: "Festival not found" };

  const timeCheck = validateScheduleTimesForFestival(
    festival,
    startTime,
    endTime,
    scheduleDayKey,
  );
  if (!timeCheck.ok) return { ok: false, error: timeCheck.error };

  const stageGuard = await assertCanWriteOnStage(festivalId, stageId);
  if (!stageGuard.ok) return { ok: false, error: stageGuard.error };

  if (stageId) {
    const stageOk = await assertStageBelongsToFestival(stageId, festivalId);
    if (!stageOk)
      return {
        ok: false,
        error: "That stage does not belong to this festival.",
      };
  }

  const conflict = await getTimeConflictError(
    festivalId,
    startTime,
    endTime,
    stageId,
    excludeEntryId,
    entryType,
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
    /** Calendar day (yyyy-MM-dd) selected in the form; required when festival has event dates */
    scheduleDayKey?: string | null;
  },
): Promise<
  | { success: true }
  | { success: false; error: string; conflictParts?: ConflictParts }
> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const effectiveFeatures = await loadFeatureOverrides(festival.tier as Tier);
  const canManage = isEnabled(festival.tier, "schedule", effectiveFeatures);
  if (!canManage)
    return { success: false, error: "Schedule is not available on your plan." };

  if (data.type === "PROGRAMME") {
    if (!data.programmeId)
      return { success: false, error: "Please select a programme." };
    const p = await db.query.programme.findFirst({
      where: eq(programmeTable.id, data.programmeId),
    });
    if (p) {
      try {
        assertProgrammePreReporting(p.status);
      } catch (e) {
        return { success: false, error: (e as AppError).message };
      }
    }
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

  const stageGuard = await assertCanWriteOnStage(festivalId, data.stageId);
  if (!stageGuard.ok) return { success: false, error: stageGuard.error };

  const timeCheck = validateScheduleTimesForFestival(
    festival,
    data.startTime,
    data.endTime ?? null,
    data.scheduleDayKey,
  );
  if (!timeCheck.ok) return { success: false, error: timeCheck.error };

  const stageOk = await assertStageBelongsToFestival(data.stageId, festivalId);
  if (!stageOk)
    return {
      success: false,
      error: "That stage does not belong to this festival.",
    };

  if (data.type === "PROGRAMME" && data.programmeId) {
    const existing = await db.query.scheduleEntry.findFirst({
      where: and(
        eq(scheduleEntryTable.festivalId, festivalId),
        eq(scheduleEntryTable.type, "PROGRAMME"),
        eq(scheduleEntryTable.programmeId, data.programmeId),
      ),
      columns: { id: true },
    });
    if (existing) {
      return {
        success: false,
        error: "That programme is already scheduled.",
      };
    }
  }

  const conflict = await getTimeConflictError(
    festivalId,
    data.startTime,
    data.endTime ?? null,
    data.stageId ?? null,
    undefined,
    data.type,
  );
  if (conflict)
    return {
      success: false,
      error: conflictPartsToMessage(conflict),
      conflictParts: conflict,
    };

  const actorUser = session?.userId
    ? await db.query.user.findFirst({
        where: eq(userTable.id, session.userId),
        columns: { email: true, displayName: true, fullName: true },
      })
    : null;

  const now = serverNowIso();
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
    startTime: parseInstant(data.startTime)!.toISOString(),
    endTime: parseInstant(data.endTime)?.toISOString() ?? null,
    order: data.order ?? 0,
    createdByName:
      actorUser?.displayName || actorUser?.fullName || actorUser?.email || null,
    createdByEmail: actorUser?.email || null,
    updatedBy: null,
    updatedAt: now,
  });

  if (data.type === "PROGRAMME" && data.programmeId) {
    await updateProgrammeStatus(data.programmeId);
  }

  revalidateSchedulePaths(festival.slug);
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");
  } catch (e) {}
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
    scheduleDayKey?: string | null;
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

  if (existing.type === "PROGRAMME" && existing.programmeId) {
    const p = await db.query.programme.findFirst({
      where: eq(programmeTable.id, existing.programmeId),
    });
    if (p) {
      try {
        assertProgrammePreReporting(p.status);
      } catch (e) {
        return { success: false, error: (e as AppError).message };
      }
    }
  }
  if (data.programmeId && data.programmeId !== existing.programmeId) {
    const p = await db.query.programme.findFirst({
      where: eq(programmeTable.id, data.programmeId),
    });
    if (p) {
      try {
        assertProgrammePreReporting(p.status);
      } catch (e) {
        return { success: false, error: (e as AppError).message };
      }
    }
  }

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const effectiveFeatures = await loadFeatureOverrides(festival.tier as Tier);
  const canManage = isEnabled(festival.tier, "schedule", effectiveFeatures);
  if (!canManage)
    return { success: false, error: "Schedule is not available on your plan." };

  if (existing.type === "SESSION" && data.title !== undefined && !data.title)
    return { success: false, error: "Session must have a title." };

  const newStartTime =
    data.startTime !== undefined
      ? data.startTime
      : parseStoredScheduleInstant(existing.startTime);
  const newEndTime =
    data.endTime !== undefined
      ? data.endTime
      : existing.endTime
        ? parseStoredScheduleInstant(existing.endTime)
        : null;
  const newStageId =
    data.stageId !== undefined ? data.stageId : existing.stageId;

  const stageGuard = await assertCanWriteOnStage(festivalId, newStageId);
  if (!stageGuard.ok) return { success: false, error: stageGuard.error };

  const timeFieldsChanging =
    data.startTime !== undefined || data.endTime !== undefined;
  if (timeFieldsChanging) {
    const timeCheck = validateScheduleTimesForFestival(
      festival,
      newStartTime,
      newEndTime,
      data.scheduleDayKey,
    );
    if (!timeCheck.ok) return { success: false, error: timeCheck.error };
  }

  if (newStageId) {
    const stageOk = await assertStageBelongsToFestival(newStageId, festivalId);
    if (!stageOk)
      return {
        success: false,
        error: "That stage does not belong to this festival.",
      };
  }

  const conflict = await getTimeConflictError(
    festivalId,
    newStartTime,
    newEndTime ?? null,
    newStageId ?? null,
    id,
    existing.type,
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

  const now = serverNowIso();
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
        startTime: parseInstant(data.startTime)?.toISOString(),
      }),
      ...(data.endTime !== undefined && {
        endTime: parseInstant(data.endTime)?.toISOString() ?? null,
      }),
      ...(data.order !== undefined && { order: data.order }),
      updatedBy,
      updatedAt: now,
    })
    .where(eq(scheduleEntryTable.id, id));

  if (existing.type === "PROGRAMME") {
    await handleProgrammeEntryMutation({
      scheduleEntryId: existing.id,
      previousProgrammeId: existing.programmeId,
      nextProgrammeId: data.programmeId,
    });
  }

  revalidateSchedulePaths(festival.slug);
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");
  } catch (e) {}
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
    columns: { id: true, type: true, programmeId: true, stageId: true },
  });
  if (!entry) return { success: false, error: "Schedule entry not found" };

  if (entry.type === "PROGRAMME" && entry.programmeId) {
    const p = await db.query.programme.findFirst({
      where: eq(programmeTable.id, entry.programmeId),
    });
    if (p) {
      try {
        assertProgrammePreReporting(p.status);
      } catch (e) {
        return { success: false, error: (e as AppError).message };
      }
    }
  }

  const stageGuard = await assertCanWriteOnStage(festivalId, entry.stageId);
  if (!stageGuard.ok) return { success: false, error: stageGuard.error };

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  await db.delete(scheduleEntryTable).where(eq(scheduleEntryTable.id, id));
  if (entry.type === "PROGRAMME") {
    await handleProgrammeEntryMutation({
      scheduleEntryId: entry.id,
      previousProgrammeId: entry.programmeId,
    });
  }

  revalidateSchedulePaths(festival.slug);
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");
  } catch (e) {}
  return { success: true };
}

export async function clearScheduleEntries(
  festivalId: string,
  filters?: { stageId?: string | null; dateKey?: string | null },
): Promise<
  { success: true; count: number } | { success: false; error: string }
> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const effectiveFeatures = await loadFeatureOverrides(festival.tier as Tier);
  const canManage = isEnabled(festival.tier, "schedule", effectiveFeatures);
  if (!canManage)
    return { success: false, error: "Schedule is not available on your plan." };

  const conditions = [eq(scheduleEntryTable.festivalId, festivalId)];

  if (filters?.stageId) {
    conditions.push(eq(scheduleEntryTable.stageId, filters.stageId));
  }

  const accessibleStageIds = await StageAssignmentService.getAccessibleStageIds(
    festivalId,
    session,
  );
  if (accessibleStageIds !== "all" && accessibleStageIds.length > 0) {
    conditions.push(inArray(scheduleEntryTable.stageId, accessibleStageIds));
  }

  let entriesToDelete = await db.query.scheduleEntry.findMany({
    where: and(...conditions),
    columns: { id: true, startTime: true, type: true, programmeId: true },
    with: { programme: { columns: { status: true } } },
  });

  entriesToDelete = entriesToDelete.filter((e) => {
    if (e.type === "PROGRAMME" && e.programme?.status) {
      try {
        assertProgrammePreReporting(e.programme.status);
      } catch {
        return false;
      }
    }
    return true;
  });

  if (filters?.dateKey) {
    entriesToDelete = entriesToDelete.filter((e) => {
      const d = parseStoredScheduleInstant(e.startTime);
      return (
        !Number.isNaN(d.getTime()) &&
        format(d, "yyyy-MM-dd") === filters.dateKey
      );
    });
  }

  if (entriesToDelete.length === 0) {
    return { success: true, count: 0 };
  }

  const ids = entriesToDelete.map((e) => e.id);
  await db
    .delete(scheduleEntryTable)
    .where(inArray(scheduleEntryTable.id, ids));

  for (const entry of entriesToDelete) {
    if (entry.type === "PROGRAMME") {
      await handleProgrammeEntryMutation({
        scheduleEntryId: entry.id,
        previousProgrammeId: entry.programmeId,
      });
    }
  }

  revalidateSchedulePaths(festival.slug);
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");
  } catch (e) {}
  return { success: true, count: entriesToDelete.length };
}

export async function reorderScheduleEntries(
  festivalId: string,
  entryIds: string[],
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const effectiveFeatures = await loadFeatureOverrides(festival.tier as Tier);
  const canManage = isEnabled(festival.tier, "schedule", effectiveFeatures);
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
    columns: {
      id: true,
      startTime: true,
      endTime: true,
      stageId: true,
      type: true,
      programmeId: true,
    },
    with: { programme: { columns: { status: true } } },
    orderBy: [asc(scheduleEntryTable.startTime), asc(scheduleEntryTable.order)],
  });

  for (const entry of oldOrder) {
    if (entry.type === "PROGRAMME" && entry.programme?.status) {
      try {
        assertProgrammePreReporting(entry.programme.status);
      } catch (e) {
        return { success: false, error: (e as AppError).message };
      }
    }
  }

  if (oldOrder.length !== entryIds.length)
    return {
      success: false,
      error: "Some entries not found or not in this festival.",
    };

  const sessionForGuard = await getSession();
  const accessibleStageIds = await StageAssignmentService.getAccessibleStageIds(
    festivalId,
    sessionForGuard,
  );
  if (accessibleStageIds !== "all") {
    const offending = oldOrder.find(
      (e) => !e.stageId || !accessibleStageIds.includes(e.stageId),
    );
    if (offending) {
      return {
        success: false,
        error: "You can only schedule on your assigned stages.",
      };
    }
  }

  await db.transaction(async (tx) => {
    const now = serverNowIso();
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

  revalidateSchedulePaths(festival.slug);
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");
  } catch (e) {}
  return { success: true };
}

export async function getScheduleEntriesEnriched(festivalId: string) {
  const entries = await getScheduleEntries(festivalId);

  const programmeIds = entries
    .map((e) => e.programmeId)
    .filter((id): id is string => !!id);

  if (programmeIds.length === 0) {
    return entries.map((e) => ({ ...e, assignmentCount: 0, teamCount: 0 }));
  }

  const assignmentCounts = await db
    .select({
      programmeId: assignmentTable.programmeId,
      count: count(),
      teamCount: sql<number>`COUNT(DISTINCT ${assignmentTable.teamNumber})`,
    })
    .from(assignmentTable)
    .where(inArray(assignmentTable.programmeId, programmeIds))
    .groupBy(assignmentTable.programmeId);

  const countMap = new Map(
    assignmentCounts
      .filter((r): r is typeof r & { programmeId: string } => !!r.programmeId)
      .map((r) => [r.programmeId, { count: r.count, teamCount: r.teamCount }]),
  );

  return entries.map((e) => ({
    ...e,
    assignmentCount: e.programmeId
      ? (countMap.get(e.programmeId)?.count ?? 0)
      : 0,
    teamCount: e.programmeId
      ? (countMap.get(e.programmeId)?.teamCount ?? 0)
      : 0,
  }));
}

export type EnrichedScheduleEntry = Awaited<
  ReturnType<typeof getScheduleEntriesEnriched>
>[number];

export async function swapScheduleSlots(
  festivalId: string,
  entryIdA: string,
  entryIdB: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const effectiveFeatures = await loadFeatureOverrides(festival.tier as Tier);
  const canManage = isEnabled(festival.tier, "schedule", effectiveFeatures);
  if (!canManage)
    return { success: false, error: "Schedule is not available on your plan." };

  const [entryA, entryB] = await Promise.all([
    db.query.scheduleEntry.findFirst({
      where: and(
        eq(scheduleEntryTable.id, entryIdA),
        eq(scheduleEntryTable.festivalId, festivalId),
      ),
    }),
    db.query.scheduleEntry.findFirst({
      where: and(
        eq(scheduleEntryTable.id, entryIdB),
        eq(scheduleEntryTable.festivalId, festivalId),
      ),
    }),
  ]);

  if (!entryA || !entryB)
    return { success: false, error: "One or both entries not found." };
  if (entryA.type !== "PROGRAMME" || entryB.type !== "PROGRAMME")
    return { success: false, error: "Can only swap programme entries." };

  if (entryA.programmeId) {
    const p = await db.query.programme.findFirst({
      where: eq(programmeTable.id, entryA.programmeId),
    });
    if (p) {
      try {
        assertProgrammePreReporting(p.status);
      } catch (e) {
        return { success: false, error: (e as AppError).message };
      }
    }
  }

  if (entryB.programmeId) {
    const p = await db.query.programme.findFirst({
      where: eq(programmeTable.id, entryB.programmeId),
    });
    if (p) {
      try {
        assertProgrammePreReporting(p.status);
      } catch (e) {
        return { success: false, error: (e as AppError).message };
      }
    }
  }

  const stageGuardA = await assertCanWriteOnStage(festivalId, entryA.stageId);
  if (!stageGuardA.ok) return { success: false, error: stageGuardA.error };
  const stageGuardB = await assertCanWriteOnStage(festivalId, entryB.stageId);
  if (!stageGuardB.ok) return { success: false, error: stageGuardB.error };

  const now = serverNowIso();
  await db.transaction(async (tx) => {
    await tx
      .update(scheduleEntryTable)
      .set({
        startTime: entryB.startTime,
        endTime: entryB.endTime,
        stageId: entryB.stageId,
        order: entryB.order,
        updatedAt: now,
        updatedBy: session?.userId ?? null,
      })
      .where(eq(scheduleEntryTable.id, entryIdA));

    await tx
      .update(scheduleEntryTable)
      .set({
        startTime: entryA.startTime,
        endTime: entryA.endTime,
        stageId: entryA.stageId,
        order: entryA.order,
        updatedAt: now,
        updatedBy: session?.userId ?? null,
      })
      .where(eq(scheduleEntryTable.id, entryIdB));
  });

  revalidateSchedulePaths(festival.slug);
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");
  } catch (e) {}
  return { success: true };
}
