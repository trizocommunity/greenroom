"use server";

import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { findFestivalById } from "@/server/models/festival.model";
import { getEffectiveFeatureEnabled } from "@/server/services/plan-features.service";
import { UsageCounterService } from "@/server/services/usage-counter.service";
import type { EventType } from "@prisma/client";

export type EventFormData = {
  name: string;
  description?: string | null;
  type: EventType;
  speakers?: string | null;
  /** When creating: add to schedule. When updating: set startTime to update/create, or omit startTime to remove from schedule. */
  schedule?: {
    startTime?: Date | null;
    endTime?: Date | null;
    stageId?: string | null;
  };
};

export async function getEvents(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  return prisma.event.findMany({
    where: { festivalId },
    orderBy: { createdAt: "desc" },
    include: {
      scheduleEntries: {
        orderBy: { startTime: "asc" },
        take: 1,
        include: { stage: { select: { id: true, name: true } } },
      },
    },
  });
}

/** Public: list all sessions (events) for a festival, with first schedule slot if any. No auth. */
export async function getSessionsPublic(festivalId: string) {
  const events = await prisma.event.findMany({
    where: { festivalId },
    orderBy: { createdAt: "desc" },
    include: {
      scheduleEntries: {
        orderBy: { startTime: "asc" },
        take: 1,
        include: { stage: { select: { id: true, name: true } } },
      },
    },
  });

  return events.map((event) => {
    const first = event.scheduleEntries[0];
    return {
      id: event.id,
      name: event.name,
      type: event.type,
      description: event.description,
      speakers: event.speakers,
      startTime: first ? first.startTime : null,
      endTime: first?.endTime ?? null,
      stage: first?.stage ?? null,
    };
  });
}

export async function createEvent(
  festivalId: string,
  data: EventFormData,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const canManage = await getEffectiveFeatureEnabled(festival.tier, "schedule");
  if (!canManage)
    return { success: false, error: "Sessions are not available on your plan." };

  const createdBy = session?.userId
    ? await prisma.user
        .findUnique({
          where: { id: session.userId },
          select: { displayName: true, fullName: true, email: true },
        })
        .then((u) => u?.displayName || u?.fullName || u?.email || "Unknown")
    : null;

  try {
    await prisma.$transaction(async (tx) => {
      await UsageCounterService.incrementUsage(festivalId, "events", 1, tx);
      const event = await tx.event.create({
        data: {
          festivalId,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          type: data.type,
          speakers: data.speakers?.trim() || null,
        },
      });
      if (data.schedule?.startTime) {
        await tx.scheduleEntry.create({
          data: {
            festivalId,
            eventId: event.id,
            programmeId: null,
            stageId: data.schedule.stageId ?? null,
            startTime: data.schedule.startTime,
            endTime: data.schedule.endTime ?? null,
            order: 0,
            createdBy,
            updatedBy: null,
          },
        });
      }
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create event.";
    return { success: false, error: message };
  }

  revalidatePath(`/dashboard/${festival.slug}/pre-works/sessions`);
  revalidatePath(`/dashboard/${festival.slug}/pre-works/schedule`);
  revalidatePath(`/${festival.slug}/sessions`);
  const created = await prisma.event.findFirst({
    where: { festivalId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return { success: true, id: created?.id ?? "" };
}

export async function updateEvent(
  festivalId: string,
  eventId: string,
  data: EventFormData,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const existing = await prisma.event.findFirst({
    where: { id: eventId, festivalId },
  });
  if (!existing) return { success: false, error: "Event not found" };

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const canManage = await getEffectiveFeatureEnabled(festival.tier, "schedule");
  if (!canManage)
    return { success: false, error: "Sessions are not available on your plan." };

  const updatedBy = session?.userId
    ? await prisma.user
        .findUnique({
          where: { id: session.userId },
          select: { displayName: true, fullName: true, email: true },
        })
        .then((u) => u?.displayName || u?.fullName || u?.email || "Unknown")
    : null;

  await prisma.event.update({
    where: { id: eventId },
    data: {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      type: data.type,
      speakers: data.speakers?.trim() || null,
    },
  });

  if (data.schedule !== undefined) {
    const firstEntry = await prisma.scheduleEntry.findFirst({
      where: { festivalId, eventId },
      orderBy: { startTime: "asc" },
      select: { id: true },
    });
    if (data.schedule?.startTime != null) {
      const payload = {
        startTime: data.schedule.startTime,
        endTime: data.schedule.endTime ?? null,
        stageId: data.schedule.stageId ?? null,
        updatedBy,
      };
      if (firstEntry) {
        await prisma.scheduleEntry.update({
          where: { id: firstEntry.id },
          data: payload,
        });
      } else {
        await prisma.scheduleEntry.create({
          data: {
            festivalId,
            eventId,
            programmeId: null,
            ...payload,
            order: 0,
            createdBy: updatedBy,
          },
        });
      }
    } else if (firstEntry) {
      await prisma.scheduleEntry.delete({ where: { id: firstEntry.id } });
    }
  }

  revalidatePath(`/dashboard/${festival.slug}/pre-works/sessions`);
  revalidatePath(`/dashboard/${festival.slug}/pre-works/schedule`);
  revalidatePath(`/${festival.slug}/sessions`);
  return { success: true };
}

export async function deleteEvent(
  festivalId: string,
  eventId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const existing = await prisma.event.findFirst({
    where: { id: eventId, festivalId },
  });
  if (!existing) return { success: false, error: "Event not found" };

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  await prisma.$transaction(async (tx) => {
    await tx.event.delete({ where: { id: eventId } });
    await UsageCounterService.incrementUsage(festivalId, "events", -1, tx);
  });

  revalidatePath(`/dashboard/${festival.slug}/pre-works/sessions`);
  revalidatePath(`/dashboard/${festival.slug}/pre-works/schedule`);
  revalidatePath(`/${festival.slug}/sessions`);
  return { success: true };
}
