import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
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

export async function findParticipantsByFestivalPaginated(
  festivalId: string,
  options: {
    page: number;
    pageSize: number;
    sort?: string;
    order?: "asc" | "desc";
    groupId?: string;
    categoryId?: string;
    search?: string;
    isTeamLeader?: boolean;
  },
) {
  const {
    page,
    pageSize,
    sort = "CREATED",
    order = "desc",
    groupId,
    categoryId,
    search,
    isTeamLeader,
  } = options;
  const offset = (page - 1) * pageSize;

  const where = and(
    eq(participants.festivalId, festivalId),
    isTeamLeader !== undefined
      ? eq(participants.isTeamLeader, isTeamLeader)
      : undefined,
    groupId && groupId !== "ALL"
      ? eq(participants.groupId, groupId)
      : undefined,
    categoryId && categoryId !== "ALL"
      ? eq(participants.categoryId, categoryId)
      : undefined,
    search
      ? or(
          ilike(participants.name, `%${search}%`),
          ilike(participants.chestNumber, `%${search}%`),
        )
      : undefined,
  );

  let sortColumn;
  if (sort === "NAME" || sort === "name") sortColumn = participants.name;
  else if (sort === "NUMERIC" || sort === "numeric" || sort === "chestNumber")
    sortColumn = participants.chestNumber;
  else sortColumn = participants.createdAt;

  const orderByClause = order === "asc" ? asc(sortColumn) : desc(sortColumn);

  const [rows, totalRows] = await Promise.all([
    db.query.participant.findMany({
      where,
      orderBy: [orderByClause, desc(participants.id)],
      limit: pageSize,
      offset,
      with: { category: true, group: true },
    }),
    db.select({ value: count() }).from(participants).where(where),
  ]);

  return {
    data: rows,
    total: totalRows[0]?.value ?? 0,
    page,
    pageSize,
    hasMore: page * pageSize < (totalRows[0]?.value ?? 0),
  };
}
