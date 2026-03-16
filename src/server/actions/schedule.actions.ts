"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { findFestivalById } from "@/server/models/festival.model";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import type { ScheduleEntryType, SessionType } from "@prisma/client";

const scheduleInclude = {
  programme: { select: { id: true, name: true, category: { select: { name: true } } } },
  stage: { select: { id: true, name: true } },
} as const;

export type ScheduleEntryWithRelations = Awaited<
  ReturnType<typeof getScheduleEntries>
>[number];

/** Check if another entry already has this startTime on the same stage (same festival). Different stages can have the same time. Returns error message or null. */
async function getTimeConflictError(
  festivalId: string,
  startTime: Date,
  stageId: string | null,
  excludeEntryId?: string,
): Promise<string | null> {
  const existing = await prisma.scheduleEntry.findFirst({
    where: {
      festivalId,
      startTime,
      stageId,
      ...(excludeEntryId ? { id: { not: excludeEntryId } } : {}),
    },
    select: { id: true },
  });
  if (!existing) return null;
  const timeStr = format(new Date(startTime), "h:mm a");
  return `${timeStr} is already taken on this stage. Pick another time or another stage.`;
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
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

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

  const conflict = await getTimeConflictError(
    festivalId,
    data.startTime,
    data.stageId ?? null,
  );
  if (conflict) return { success: false, error: conflict };

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
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

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
  const newStageId =
    data.stageId !== undefined ? data.stageId : existing.stageId;
  const conflict = await getTimeConflictError(
    festivalId,
    newStartTime,
    newStageId ?? null,
    id,
  );
  if (conflict) return { success: false, error: conflict };

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
  await assertFestivalAccess(session, festivalId);

  const entry = await prisma.scheduleEntry.findFirst({
    where: { id, festivalId },
    select: { id: true },
  });
  if (!entry) return { success: false, error: "Schedule entry not found" };

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  await prisma.scheduleEntry.delete({ where: { id } });

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
  await assertFestivalAccess(session, festivalId);

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const canManage = await getEffectiveFeatureEnabled(festival.tier, "schedule");
  if (!canManage)
    return { success: false, error: "Schedule is not available on your plan." };

  await prisma.$transaction(
    entryIds.map((entryId, index) =>
      prisma.scheduleEntry.updateMany({
        where: { id: entryId, festivalId },
        data: { order: index },
      }),
    ),
  );

  revalidatePath(`/dashboard/${festival.slug}/pre-works/schedule`);
  revalidatePath(`/dashboard/${festival.slug}/pre-works/sessions`);
  revalidatePath(`/${festival.slug}/sessions`);
  revalidatePath(`/${festival.slug}/programmes`);
  return { success: true };
}
