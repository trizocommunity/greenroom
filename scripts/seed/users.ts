import { eq } from "drizzle-orm";
import { generateId } from "../../src/core/database/ids";
import * as schema from "../../src/core/database/schema";
import {
  FESTIVAL_OWNER_EMAIL,
  FESTIVAL_OWNER_NAME,
  INSTITUTION,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_NAME,
} from "./config";
import type { DB } from "./db";

type AccountType = "PERSONAL" | "INSTITUTIONAL";

export async function getOrCreateUser(
  db: DB,
  email: string,
  fullName: string,
  globalRole: "SUPER_ADMIN" | "USER",
  displayName?: string,
  accountType?: AccountType,
  institutionId?: string,
): Promise<string> {
  const now = new Date().toISOString();
  const emailLower = email.toLowerCase().trim();
  const existing = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, emailLower),
  });

  if (existing) {
    await db
      .update(schema.user)
      .set({
        fullName,
        displayName: displayName ?? fullName,
        ...(accountType ? { accountType } : {}),
        ...(institutionId ? { institutionId } : {}),
        updatedAt: now,
      })
      .where(eq(schema.user.id, existing.id));
    return existing.id;
  }

  const id = generateId();
  await db.insert(schema.user).values({
    id,
    email: emailLower,
    globalRole,
    fullName,
    displayName: displayName ?? fullName,
    ...(accountType ? { accountType } : {}),
    ...(institutionId ? { institutionId } : {}),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function getOrCreateInstitution(
  db: DB,
  ownerId: string,
  data: typeof INSTITUTION,
): Promise<string> {
  const now = new Date().toISOString();
  const existing = await db.query.institution.findFirst({
    where: (i, { eq }) => eq(i.ownerId, ownerId),
  });

  if (existing) {
    await db
      .update(schema.institution)
      .set({
        name: data.name,
        type: data.type,
        affiliation: data.affiliation ?? null,
        city: data.city ?? null,
        sizeRange: data.sizeRange ?? null,
        updatedAt: now,
      })
      .where(eq(schema.institution.id, existing.id));
    return existing.id;
  }

  const id = generateId();
  await db.insert(schema.institution).values({
    id,
    ownerId,
    name: data.name,
    type: data.type,
    affiliation: data.affiliation ?? null,
    city: data.city ?? null,
    sizeRange: data.sizeRange ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function createSuperAdmin(db: DB): Promise<void> {
  await getOrCreateUser(db, SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME, "SUPER_ADMIN");
  console.log(`✅ Super Admin verified/created: ${SUPER_ADMIN_EMAIL}`);
}

export async function createFestivalOwner(
  db: DB,
): Promise<{ ownerId: string; institutionId: string }> {
  const ownerId = await getOrCreateUser(
    db,
    FESTIVAL_OWNER_EMAIL,
    FESTIVAL_OWNER_NAME,
    "USER",
  );
  const institutionId = await getOrCreateInstitution(db, ownerId, INSTITUTION);

  await db
    .update(schema.user)
    .set({
      fullName: FESTIVAL_OWNER_NAME,
      displayName: FESTIVAL_OWNER_NAME,
      accountType: "INSTITUTIONAL",
      institutionId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.user.id, ownerId));

  console.log(`✅ Institution created: ${INSTITUTION.name}`);
  console.log(`✅ Festival Owner verified/created: ${FESTIVAL_OWNER_EMAIL}`);
  return { ownerId, institutionId };
}
