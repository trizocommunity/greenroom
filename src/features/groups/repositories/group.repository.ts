import { desc, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  group as groups,
  participant as participants,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";

export async function createGroup(
  data: Omit<typeof groups.$inferInsert, "id" | "updatedAt"> & {
    id?: string;
    updatedAt?: string;
  },
) {
  const { randomUUID } = await import("crypto");
  const result = await db
    .insert(groups)
    .values({
      id: data.id ?? randomUUID(),
      updatedAt: data.updatedAt ?? serverNowIso(),
      ...data,
    })
    .returning();
  return result[0];
}

export async function updateGroup(
  id: string,
  data: Partial<typeof groups.$inferInsert>,
) {
  const result = await db
    .update(groups)
    .set(data)
    .where(eq(groups.id, id))
    .returning();
  return result[0];
}

export async function deleteGroup(id: string) {
  const result = await db.delete(groups).where(eq(groups.id, id)).returning();
  return result[0];
}

export async function findGroupById(id: string) {
  const group = await db.query.group.findFirst({
    where: eq(groups.id, id),
    with: { participants: { columns: { id: true } } },
  });

  if (!group) return null;
  const { participants: st, ...rest } = group;
  return { ...rest, _count: { participants: st.length } };
}

export async function findGroupsByFestival(festivalId: string) {
  const results = await db.query.group.findMany({
    where: eq(groups.festivalId, festivalId),
    orderBy: [desc(groups.createdAt)],
    with: {
      participants: { columns: { id: true, name: true, isTeamLeader: true } },
    },
  });

  return results.map((grp) => {
    const { participants: st, ...rest } = grp;
    return {
      ...rest,
      _count: { participants: st.length },
      participants: st.filter((s) => s.isTeamLeader),
    };
  });
}
