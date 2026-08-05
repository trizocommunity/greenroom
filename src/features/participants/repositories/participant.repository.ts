import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { participant as participants } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { ProgrammeMembershipService } from "@/features/assignments/services/programme-membership.service";

export async function createParticipant(
  data: Omit<typeof participants.$inferInsert, "id" | "updatedAt"> & {
    id?: string;
    updatedAt?: string;
  },
  tx?: typeof db,
) {
  const client = tx ?? db;
  const { randomUUID } = await import("crypto");
  const result = await client
    .insert(participants)
    .values({
      id: data.id ?? randomUUID(),
      updatedAt: data.updatedAt ?? serverNowIso(),
      ...data,
    })
    .returning();
  return result[0];
}

export async function deleteParticipant(id: string) {
  const result = await db
    .delete(participants)
    .where(eq(participants.id, id))
    .returning();
  return result[0];
}

export async function updateParticipant(
  id: string,
  data: Partial<typeof participants.$inferInsert>,
  tx?: typeof db,
) {
  const client = tx ?? db;
  const result = await client
    .update(participants)
    .set(data)
    .where(eq(participants.id, id))
    .returning();
  return result[0];
}

export async function findParticipantById(id: string) {
  return db.query.participant.findFirst({
    where: eq(participants.id, id),
    with: { category: true, group: true },
  });
}

export async function findParticipantByFestivalAndProfileSlug(
  festivalId: string,
  profileSlug: string,
) {
  const base = await db.query.participant.findFirst({
    where: and(
      eq(participants.festivalId, festivalId),
      eq(participants.profileSlug, profileSlug),
    ),
    with: {
      category: true,
      group: true,
      assignments: {
        with: {
          programme: { with: { category: true } },
        },
      },
    },
  });
  if (!base) return null;
  const assignedProgrammes =
    await ProgrammeMembershipService.getProgrammesForParticipant(
      base.id,
      base.festivalId,
    );
  return { ...base, assignedProgrammes };
}

export async function findParticipantsByFestival(
  festivalId: string,
  groupId?: string,
) {
  return db.query.participant.findMany({
    where: groupId
      ? and(
          eq(participants.festivalId, festivalId),
          eq(participants.groupId, groupId),
        )
      : eq(participants.festivalId, festivalId),
    orderBy: [desc(participants.createdAt)],
    with: { category: true, group: true },
  });
}

export async function countParticipants(festivalId: string) {
  const result = await db
    .select({ c: count() })
    .from(participants)
    .where(eq(participants.festivalId, festivalId));
  return result[0].c;
}
