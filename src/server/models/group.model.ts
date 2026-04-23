import { db } from "@/lib/db";
import { group as groups, student as students } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export async function createGroup(data: typeof groups.$inferInsert) {
  const result = await db.insert(groups).values(data).returning();
  return result[0];
}

export async function updateGroup(id: string, data: Partial<typeof groups.$inferInsert>) {
  const result = await db.update(groups).set(data).where(eq(groups.id, id)).returning();
  return result[0];
}

export async function deleteGroup(id: string) {
  const result = await db.delete(groups).where(eq(groups.id, id)).returning();
  return result[0];
}

export async function findGroupById(id: string) {
  const group = await db.query.group.findFirst({
    where: eq(groups.id, id),
    with: { students: { columns: { id: true } } },
  });

  if (!group) return null;
  const { students: st, ...rest } = group;
  return { ...rest, _count: { students: st.length } };
}

export async function findGroupsByFestival(festivalId: string) {
  const results = await db.query.group.findMany({
    where: eq(groups.festivalId, festivalId),
    orderBy: [desc(groups.createdAt)],
    with: {
      students: { columns: { id: true, name: true, isTeamLeader: true } },
    },
  });

  return results.map((grp) => {
    const { students: st, ...rest } = grp;
    return {
      ...rest,
      _count: { students: st.length },
      students: st.filter(s => s.isTeamLeader),
    };
  });
}
