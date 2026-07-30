import { eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { institution, type institutionType } from "@/core/database/schema";

export async function findInstitutionById(id: string) {
  return db.query.institution.findFirst({
    where: eq(institution.id, id),
  });
}

export async function createInstitution(data: {
  name: string;
  type: (typeof institutionType.enumValues)[number];
  affiliation?: string | null;
  city?: string | null;
  sizeRange?: string | null;
  ownerId: string;
}) {
  const { randomUUID } = await import("crypto");
  const result = await db
    .insert(institution)
    .values({
      id: randomUUID(),
      name: data.name,
      type: data.type,
      affiliation: data.affiliation ?? null,
      city: data.city ?? null,
      sizeRange: data.sizeRange ?? null,
      ownerId: data.ownerId,
    })
    .returning();
  return result[0];
}

export async function updateInstitution(
  id: string,
  data: Partial<typeof institution.$inferInsert>,
) {
  const result = await db
    .update(institution)
    .set(data)
    .where(eq(institution.id, id))
    .returning();
  return result[0];
}
