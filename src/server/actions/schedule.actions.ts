"use server";

import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { findFestivalById } from "@/server/models/festival.model";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";

const scheduleInclude = {
  programme: { select: { id: true, name: true, category: { select: { name: true } } } },
  event: { select: { id: true, name: true, type: true, description: true, speakers: true } },
  stage: { select: { id: true, name: true } },
} as const;

export type ScheduleEntryWithRelations = Awaited<
  ReturnType<typeof getScheduleEntries>
>[number];

export async function getScheduleEntries(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  return prisma.scheduleEntry.findMany({
    where: { festivalId },
    include: scheduleInclude,
    orderBy: [{ startTime: "asc" }, { order: "asc" }],
  });
}

/** Public read-only: no auth. Used by public sessions page. */
export async function getScheduleEntriesPublic(festivalId: string) {
  return prisma.scheduleEntry.findMany({
    where: { festivalId },
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
    programmeId?: string | null;
    eventId?: string | null;
    stageId?: string | null;
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

  const hasProgramme = !!data.programmeId;
  const hasEvent = !!data.eventId;
  if (hasProgramme === hasEvent)
    return { success: false, error: "Select either a programme or an event, not both nor neither." };

  const createdBy = session?.userId ? await getDisplayName(session.userId) : null;

  await prisma.scheduleEntry.create({
    data: {
      festivalId,
      programmeId: data.programmeId || null,
      eventId: data.eventId || null,
      stageId: data.stageId || null,
      startTime: data.startTime,
      endTime: data.endTime ?? null,
      order: data.order ?? 0,
      createdBy,
      updatedBy: null,
    },
  });

  revalidatePath(`/dashboard/${festival.slug}/pre-works/schedule`);
  revalidatePath(`/${festival.slug}/sessions`);
  revalidatePath(`/${festival.slug}/programmes`);
  return { success: true };
}

export async function updateScheduleEntry(
  festivalId: string,
  id: string,
  data: {
    programmeId?: string | null;
    eventId?: string | null;
    stageId?: string | null;
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

  if (data.programmeId !== undefined || data.eventId !== undefined) {
    const programmeId = data.programmeId !== undefined ? data.programmeId : existing.programmeId;
    const eventId = data.eventId !== undefined ? data.eventId : existing.eventId;
    const hasProgramme = !!programmeId;
    const hasEvent = !!eventId;
    if (hasProgramme === hasEvent)
      return { success: false, error: "Entry must have either a programme or an event." };
  }

  const updatedBy = session?.userId ? await getDisplayName(session.userId) : null;

  await prisma.scheduleEntry.update({
    where: { id },
    data: {
      ...(data.programmeId !== undefined && { programmeId: data.programmeId }),
      ...(data.eventId !== undefined && { eventId: data.eventId }),
      ...(data.stageId !== undefined && { stageId: data.stageId }),
      ...(data.startTime !== undefined && { startTime: data.startTime }),
      ...(data.endTime !== undefined && { endTime: data.endTime }),
      ...(data.order !== undefined && { order: data.order }),
      updatedBy,
    },
  });

  revalidatePath(`/dashboard/${festival.slug}/pre-works/schedule`);
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
  revalidatePath(`/${festival.slug}/sessions`);
  revalidatePath(`/${festival.slug}/programmes`);
  return { success: true };
}
